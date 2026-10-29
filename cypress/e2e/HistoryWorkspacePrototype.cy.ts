import { createBrowserClient, createChunks, stringToBase64URL } from '@supabase/ssr'
import { buildBrowserSupabaseStorageKey } from '../../ui/web/adapters/supabaseClient'

const service = 'http://127.0.0.1:55421'
const cookieKey = buildBrowserSupabaseStorageKey(service)
const workspaceKey = 'everfreenote:notes-workspace:v1'
const password = `Qa-${crypto.randomUUID()}!`
type Session = { access_token: string; user: { id: string } }

describe('same-document browser history with unavailable storage', { retries: 0 }, () => {
  let session: Session | undefined
  let email = ''
  let otherSession: Session | undefined
  const original = 'QA history original'
  const draft = 'QA history unsaved draft'

  beforeEach(() => {
    session = undefined
    otherSession = undefined
    email = `qa-history-${crypto.randomUUID()}@example.com`
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`,
      headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email, password }, log: false,
    }).then(({ body }) => {
      session = body as Session
      expect(session.access_token).to.be.a('string')
      return cy.task('historyAccount', session.user.id).then(() => {
        if (!session) throw new Error('isolated session not created')
        return cy.request({
          method: 'POST', url: `${service}/rest/v1/notes`,
          headers: { apikey: Cypress.env('qaAnonKey'), Authorization: `Bearer ${session.access_token}`, Prefer: 'return=representation' },
          body: { user_id: session.user.id, title: original, description: '<p>History QA fixture</p>', tags: [] }, log: false,
        })
      })
    }).its('status').should('equal', 201)
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    // Start from settings, then use its real Next router button to establish a
    // same-document history entry; cy.visit alone would create two documents.
    cy.visit('/settings?tab=account')
    cy.document().then(doc => {
      const style = doc.createElement('style')
      style.textContent = '[role="alertdialog"][data-state="open"] { animation: none !important; opacity: 1 !important; }'
      doc.head.appendChild(style)
    })
    cy.window().then(win => { (win as unknown as { historyQaMarker: string }).historyQaMarker = 'same-document' })
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.window().its('historyQaMarker').should('equal', 'same-document')
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', original).click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.window().then(win => {
      const originalPut = win.IDBObjectStore.prototype.put
      cy.stub(win.IDBObjectStore.prototype, 'put').callsFake(function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        if ((value as { title?: string })?.title === draft) throw new DOMException('QA local write failure', 'QuotaExceededError')
        return originalPut.call(this, value, key)
      }).as('failedNoteWrite')
      win.sessionStorage.removeItem(workspaceKey)
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').clear().type(draft)
    cy.get('@failedNoteWrite', { timeout: 12000 }).should(spy => expect((spy as unknown as { getCalls: () => Array<{ args: Array<{ title?: string }> }> }).getCalls().some(call => call.args[0]?.title === draft)).to.equal(true))
    cy.get('[data-cy="workspace-tab"] [aria-label*="QA local write failure"]').should('exist')
    cy.window().its('sessionStorage').invoke('getItem', workspaceKey).should('equal', null)
  })

  afterEach(() => {
    for (const account of [session, otherSession]) {
      if (!account) continue
      cy.task('deleteHistoryAccount', account.user.id, { log: false }).should('equal', 200)
    }
  })

  it('restores a failed live draft after Back and Forward without either local store', () => {
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.window().its('historyQaMarker').should('equal', 'same-document')
    cy.go('forward')
    cy.location('pathname').should('equal', '/')
    cy.window().its('historyQaMarker').should('equal', 'same-document')
    cy.get('[aria-label="Note title"]').should('have.value', draft)
  })

  it('asks before discarding an unsaved memory draft when signing out from Settings', () => {
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.get('[data-cy="settings-sign-out-button"]').click()
    cy.get('[role="alertdialog"][data-state="open"]').should('be.visible').and('contain', 'Unsaved changes')
    cy.contains('button', 'Keep editing').click()
    cy.get('[role="alertdialog"][data-state="open"]').should('not.exist')
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', draft)
  })

  it('captures input made immediately before Back, before the draft debounce fires', () => {
    const immediate = 'QA immediate pre-navigation input'
    cy.get('[aria-label="Note title"]').then(input => {
      const element = input[0] as HTMLTextAreaElement
      const win = element.ownerDocument.defaultView!
      const setter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value')?.set
      if (!setter) throw new Error('native textarea setter unavailable')
      setter.call(element, immediate)
      element.dispatchEvent(new win.Event('input', { bubbles: true }))
      win.history.back()
    })
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', immediate)
  })

  it('removes the memory draft only after explicitly discarding it and signing out', () => {
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.get('[data-cy="settings-sign-out-button"]').click()
    cy.get('[role="alertdialog"][data-state="open"]').should('be.visible')
    cy.contains('button', 'Discard changes and sign out').click()
    cy.contains('Your personal note-taking companion').should('be.visible')
    cy.then({ timeout: 10000 }, async () => {
      const client = createBrowserClient(service, Cypress.env('qaAnonKey'), { isSingleton: false, auth: { storageKey: cookieKey } })
      const { error } = await client.auth.signInWithPassword({ email, password })
      expect(error).to.equal(null)
    })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', original).should('be.visible')
    cy.get('body').should('not.contain', draft)
  })

  it('never shows another account its memory draft and restores it after switching back', () => {
    const otherEmail = `qa-history-other-${crypto.randomUUID()}@example.com`
    let client: ReturnType<typeof createBrowserClient>
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: otherEmail, password }, log: false,
    }).then(({ body }) => {
      otherSession = body as Session
      return cy.task('historyAccount', otherSession.user.id).then(() => {
        if (!otherSession) throw new Error('other isolated session not created')
        return cy.request({
          method: 'POST', url: `${service}/rest/v1/notes`,
          headers: { apikey: Cypress.env('qaAnonKey'), Authorization: `Bearer ${otherSession.access_token}`, Prefer: 'return=representation' },
          body: { user_id: otherSession.user.id, title: 'QA other account note', description: '<p>Other fixture</p>', tags: [] }, log: false,
        })
      })
    }).its('status').should('equal', 201)
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.then(() => { client = createBrowserClient(service, Cypress.env('qaAnonKey'), { isSingleton: false, auth: { storageKey: cookieKey } }) })
    cy.then({ timeout: 10000 }, async () => {
      const { error } = await client.auth.signInWithPassword({ email: otherEmail, password })
      expect(error).to.equal(null)
    })
    cy.go('forward')
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'QA other account note').should('be.visible')
    cy.get('body').should('not.contain', draft)
    cy.window().then(win => {
      const event = new win.Event('beforeunload', { cancelable: true })
      win.dispatchEvent(event)
      expect(event.defaultPrevented).to.equal(true)
    })
    cy.task('historyStep', 'owner B shows no A draft')
    cy.then({ timeout: 10000 }, async () => {
      const { error } = await client.auth.signInWithPassword({ email, password })
      expect(error).to.equal(null)
    })
    cy.get('[aria-label="Note title"]').should('have.value', draft)
    cy.task('historyStep', 'owner A draft restored')
  })

  it('does not resurrect the old failed draft after a successful save and account switch', () => {
    const otherEmail = `qa-history-other-${crypto.randomUUID()}@example.com`
    const savedTitle = 'QA newer successfully saved title'
    let client: ReturnType<typeof createBrowserClient>
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: otherEmail, password }, log: false,
    }).then(({ body }) => {
      otherSession = body as Session
      return cy.task('historyAccount', otherSession.user.id)
    })
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', draft)
    cy.get('@failedNoteWrite').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.intercept('PATCH', '**/rest/v1/notes*').as('saveNewTitle')
    cy.get('[aria-label="Note title"]').clear().type(savedTitle)
    cy.get('[data-cy="note-save-button"]').click()
    cy.wait('@saveNewTitle').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.task('historyStep', 'new title confirmed by server')
    cy.then(() => { client = createBrowserClient(service, Cypress.env('qaAnonKey'), { isSingleton: false, auth: { storageKey: cookieKey } }) })
    cy.then({ timeout: 10000 }, async () => {
      const { error } = await client.auth.signInWithPassword({ email: otherEmail, password })
      expect(error).to.equal(null)
    })
    cy.contains('No notes yet').should('be.visible')
    cy.then({ timeout: 10000 }, async () => {
      const { error } = await client.auth.signInWithPassword({ email, password })
      expect(error).to.equal(null)
    })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', savedTitle).should('be.visible')
    cy.get('body').should('not.contain', draft)
    cy.task('historyStep', 'saved title remains current after account switch')
  })
})
