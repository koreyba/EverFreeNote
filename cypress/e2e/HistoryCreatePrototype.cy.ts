import { createBrowserClient, createChunks, stringToBase64URL } from '@supabase/ssr'
import { buildBrowserSupabaseStorageKey } from '../../ui/web/adapters/supabaseClient'

const service = 'http://127.0.0.1:55421'
const cookieKey = buildBrowserSupabaseStorageKey(service)
const workspaceKey = 'everfreenote:notes-workspace:v1'
type Session = { access_token: string; user: { id: string } }

function localNotes(win: Window): Promise<Array<{ id?: string; title?: string }>> {
  return new Promise((resolve, reject) => {
    const request = win.indexedDB.open('everfreenote-offline')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const getAll = request.result.transaction('notes').objectStore('notes').getAll()
      getAll.onerror = () => reject(getAll.error)
      getAll.onsuccess = () => resolve(getAll.result)
    }
  })
}

async function waitForLocalNote(win: Window, title: string): Promise<Array<{ id?: string; title?: string }>> {
  const deadline = Date.now() + 10000
  do {
    const notes = await localNotes(win)
    if (notes.some(note => note.title === title)) return notes
    await new Promise(resolve => setTimeout(resolve, 100))
  } while (Date.now() < deadline)
  throw new Error('The first create did not finish in local storage')
}

async function waitForRemoteNote(win: Window, title: string, accessToken: string, anonKey: string): Promise<Array<{ id: string; title: string }>> {
  const deadline = Date.now() + 15000
  const url = new URL(`${service}/rest/v1/notes`)
  url.searchParams.set('select', 'id,title')
  url.searchParams.set('title', `eq.${title}`)
  do {
    const response = await win.fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) throw new Error(`QA remote lookup failed: ${response.status}`)
    const notes = await response.json() as Array<{ id: string; title: string }>
    if (notes.length) return notes
    await new Promise(resolve => setTimeout(resolve, 200))
  } while (Date.now() < deadline)
  throw new Error('Retried note was not synchronized')
}

describe('first save crossing same-document history', { retries: 0 }, () => {
  let session: Session | undefined
  let otherSession: Session | undefined

  beforeEach(() => { session = undefined; otherSession = undefined })

  afterEach(() => {
    for (const account of [session, otherSession]) {
      if (!account) continue
      cy.task('deleteHistoryAccount', account.user.id, { log: false }).should('equal', 200)
    }
  })

  it('keeps one note identity when the first save resolves away from the editor', () => {
    const title = 'QA first-save history identity'
    let release: (() => void) | undefined
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: `qa-history-first-${crypto.randomUUID()}@example.com`, password: `Qa-${crypto.randomUUID()}!` }, log: false,
    }).then(({ body }) => {
      session = body as Session
      return cy.task('historyAccount', session.user.id)
    })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const factory = win.indexedDB
      const original = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = original(name, version)
        if (!held && name === 'everfreenote-offline') {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.then(() => release?.())
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    // The original create must finish locally while the editor is absent.
    cy.window().then(win => waitForLocalNote(win, title))
      .then(notes => expect(notes.filter(note => note.title === title)).to.have.length(1))
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', title)
    cy.window().then(win => { cy.spy(win.IDBObjectStore.prototype, 'put').as('manualSavePut') })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@manualSavePut').should(spy => expect((spy as unknown as { getCalls: () => Array<{ args: Array<{ title?: string }> }> }).getCalls().some(call => call.args[0]?.title === title)).to.equal(true))
    cy.get('[data-cy="workspace-tab"] [aria-label="Saving changes"]').should('not.exist')
    cy.window().then(win => localNotes(win))
      .then(notes => expect(notes.filter(note => note.title === title)).to.have.length(1))
  })

  it('keeps one identity when Save is pressed again before the first create finishes', () => {
    const title = 'QA overlapping first-save history identity'
    const latest = `${title} latest edit`
    let release: (() => void) | undefined
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: `qa-history-first-${crypto.randomUUID()}@example.com`, password: `Qa-${crypto.randomUUID()}!` }, log: false,
    }).then(({ body }) => {
      session = body as Session
      return cy.task('historyAccount', session.user.id)
    })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const factory = win.indexedDB
      const original = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = original(name, version)
        if (!held && name === 'everfreenote-offline') {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', title)
    cy.window().then(win => { cy.spy(win.IDBObjectStore.prototype, 'put').as('overlappingSavePuts') })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').type(' latest edit', { delay: 0 })
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.then(() => release?.())
    cy.get('@overlappingSavePuts').should(spy => expect((spy as unknown as { getCalls: () => Array<{ args: Array<{ title?: string }> }> }).getCalls().filter(call => call.args[0]?.title === title)).to.have.length.at.least(2))
    cy.get('[data-cy="workspace-tab"] [aria-label="Saving changes"]').should('not.exist')
    cy.get('[aria-label="Note title"]').should('have.value', latest)
    cy.window().then(win => waitForLocalNote(win, latest))
      .then(notes => expect(notes.filter(note => note.title === title || note.title === latest)).to.have.length(1))
  })

  it('retries the same identity after the first create fails while away', () => {
    const title = 'QA failed first-create identity'
    let release: (() => void) | undefined
    let localId: string | undefined
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: `qa-history-first-${crypto.randomUUID()}@example.com`, password: `Qa-${crypto.randomUUID()}!` }, log: false,
    }).then(({ body }) => {
      session = body as Session
      return cy.task('historyAccount', session.user.id)
    })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const originalPut = win.IDBObjectStore.prototype.put
      cy.stub(win.IDBObjectStore.prototype, 'put').callsFake(function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        if ((value as { title?: string })?.title === title) throw new DOMException('QA failed first local create', 'QuotaExceededError')
        return originalPut.call(this, value, key)
      }).as('failedFirstCreate')
      const factory = win.indexedDB
      const originalOpen = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = originalOpen(name, version)
        if (!held && name === 'everfreenote-offline') {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.then(() => release?.())
    cy.get('@failedFirstCreate').should(spy => expect((spy as unknown as { getCalls: () => Array<{ args: Array<{ title?: string }> }> }).getCalls().some(call => call.args[0]?.title === title)).to.equal(true))
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.get('@failedFirstCreate').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.go('forward')
    cy.get('[aria-label="Note title"]').should('have.value', title)
    cy.get('[data-cy="note-save-button"]').click()
    cy.window().then(win => waitForLocalNote(win, title))
      .then(notes => {
        const matching = notes.filter(note => note.title === title)
        expect(matching).to.have.length(1)
        localId = matching[0].id
        expect(localId).to.be.a('string')
      })
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => true })
      win.dispatchEvent(new win.Event('online'))
    })
    cy.window().then(win => {
      if (!session) throw new Error('isolated session missing')
      return waitForRemoteNote(win, title, session.access_token, Cypress.env('qaAnonKey'))
    }).then(notes => {
      expect(notes).to.have.length(1)
      expect(notes[0].id).to.equal(localId)
    })
  })

  it('keeps an in-flight create private and preserves its identity across A to B to A', () => {
    const title = 'QA account-transition pending create'
    const password = `Qa-${crypto.randomUUID()}!`
    const emailA = `qa-history-first-${crypto.randomUUID()}@example.com`
    const emailB = `qa-history-other-${crypto.randomUUID()}@example.com`
    let release: (() => void) | undefined
    let client: ReturnType<typeof createBrowserClient>
    cy.viewport(1440, 900)
    cy.request({ method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') }, body: { email: emailA, password }, log: false })
      .then(({ body }) => { session = body as Session; return cy.task('historyAccount', session.user.id) })
    cy.request({ method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') }, body: { email: emailB, password }, log: false })
      .then(({ body }) => { otherSession = body as Session; return cy.task('historyAccount', otherSession.user.id) })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const factory = win.indexedDB
      const original = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = original(name, version)
        if (!held && name === 'everfreenote-offline') {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.then(() => { client = createBrowserClient(service, Cypress.env('qaAnonKey'), { isSingleton: false, auth: { storageKey: cookieKey } }) })
    cy.then({ timeout: 10000 }, async () => { const { error } = await client.auth.signInWithPassword({ email: emailB, password }); expect(error).to.equal(null) })
    cy.contains('No notes yet').should('be.visible')
    cy.get('body').should('not.contain', title)
    cy.then({ timeout: 10000 }, async () => { const { error } = await client.auth.signInWithPassword({ email: emailA, password }); expect(error).to.equal(null) })
    cy.get('[aria-label="Note title"]').should('have.value', title)
    cy.window().then(win => { cy.spy(win.IDBObjectStore.prototype, 'put').as('sameIdentityPuts') })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.then(() => release?.())
    cy.get('@sameIdentityPuts').should(spy => expect((spy as unknown as { getCalls: () => Array<{ args: Array<{ title?: string }> }> }).getCalls().filter(call => call.args[0]?.title === title)).to.have.length.at.least(2))
    cy.get('[data-cy="workspace-tab"] [aria-label="Saving changes"]').should('not.exist')
    cy.window().then(win => waitForLocalNote(win, title))
      .then(notes => expect(notes.filter(note => note.title === title)).to.have.length(1))
  })

  it('does not save an uncommitted create after explicitly discarding and signing out', () => {
    const title = 'QA discard pending create'
    const email = `qa-history-first-${crypto.randomUUID()}@example.com`
    const password = `Qa-${crypto.randomUUID()}!`
    let release: (() => void) | undefined
    let queueReadCompleted = false
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email, password }, log: false,
    }).then(({ body }) => {
      session = body as Session
      return cy.task('historyAccount', session.user.id)
    })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const factory = win.indexedDB
      const original = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = original(name, version)
        if (!held && name === 'everfreenote-offline') {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.get('[data-cy="settings-sign-out-button"]').click()
    cy.get('[role="alertdialog"][data-state="open"]').should('be.visible').and('contain', 'A save has already started')
    cy.contains('button', 'Discard changes and sign out').click()
    cy.contains('Your personal note-taking companion').should('be.visible')
    cy.then({ timeout: 10000 }, async () => {
      const client = createBrowserClient(service, Cypress.env('qaAnonKey'), { isSingleton: false, auth: { storageKey: cookieKey } })
      const { error } = await client.auth.signInWithPassword({ email, password })
      expect(error).to.equal(null)
    })
    cy.contains('No notes yet').should('be.visible')
    cy.get('body').should('not.contain', title)
    cy.window().then(win => {
      const originalGetAll = win.IDBObjectStore.prototype.getAll
      cy.stub(win.IDBObjectStore.prototype, 'getAll').callsFake(function(this: IDBObjectStore, query?: IDBValidKey | IDBKeyRange | null, count?: number) {
        if (this.name === 'queue') this.transaction.addEventListener('complete', () => { queueReadCompleted = true }, { once: true })
        return originalGetAll.call(this, query, count)
      })
    })
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.then(() => release?.())
    cy.wrap(null, { timeout: 10000 }).should(() => expect(queueReadCompleted).to.equal(true))
    cy.window().then(win => localNotes(win))
      .then(notes => expect(notes.filter(note => note.title === title)).to.have.length(0))
  })

  it('warns when a write already inside the storage adapter may still finish', () => {
    const title = 'QA already started adapter write'
    let release: (() => void) | undefined
    cy.viewport(1440, 900)
    cy.request({
      method: 'POST', url: `${service}/auth/v1/signup`, headers: { apikey: Cypress.env('qaAnonKey') },
      body: { email: `qa-history-first-${crypto.randomUUID()}@example.com`, password: `Qa-${crypto.randomUUID()}!` }, log: false,
    }).then(({ body }) => {
      session = body as Session
      return cy.task('historyAccount', session.user.id)
    })
    cy.visit('/')
    cy.then(() => {
      if (!session) throw new Error('isolated session not created')
      for (const chunk of createChunks(cookieKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)) cy.setCookie(chunk.name, chunk.value, { log: false })
    })
    cy.visit('/settings?tab=account')
    cy.get('[aria-label="Close settings"]').click()
    cy.location('pathname').should('equal', '/')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      const originalSet = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function(this: Storage, key: string, value: string) {
        if (this === win.sessionStorage && key === workspaceKey) throw new DOMException('QA denied workspace write', 'QuotaExceededError')
        return originalSet.call(this, key, value)
      })
    })
    cy.get('[aria-label="Note title"]').type(title, { delay: 0 })
    cy.window().then(win => {
      const factory = win.indexedDB
      const original = factory.open.bind(factory)
      let held = false
      cy.stub(factory, 'open').callsFake((name: string, version?: number) => {
        const request = original(name, version)
        const errorCtor = Error as ErrorConstructor & { stackTraceLimit: number }
        const limit = errorCtor.stackTraceLimit
        errorCtor.stackTraceLimit = 80
        const stack = new Error().stack ?? ''
        errorCtor.stackTraceLimit = limit
        if (!held && name === 'everfreenote-offline' && stack.includes('writeItem')) {
          held = true
          Object.defineProperty(request, 'onsuccess', {
            configurable: true,
            set(handler: ((event: Event) => unknown) | null) {
              if (handler) request.addEventListener('success', event => { release = () => handler.call(request, event) }, { once: true })
            },
          })
        }
        return request
      }).as('heldIndexedDbOpen')
    })
    cy.wrap(null, { timeout: 10000 }).should(() => expect(release).to.be.a('function'))
    cy.go('back')
    cy.location('pathname').should('match', /^\/settings\/?$/)
    cy.get('[data-cy="settings-sign-out-button"]').click()
    cy.get('[role="alertdialog"][data-state="open"]').should('be.visible').and('contain', 'A save has already started and may still finish')
    cy.contains('button', 'Discard changes and sign out').click()
    cy.contains('Your personal note-taking companion').should('be.visible')
    cy.get('@heldIndexedDbOpen').then(stub => (stub as unknown as { restore: () => void }).restore())
    cy.then(() => release?.())
    cy.window().then(win => waitForLocalNote(win, title))
      .then(notes => expect(notes.filter(note => note.title === title)).to.have.length(1))
  })
})
