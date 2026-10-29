import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter as storage } from '@ui/web/adapters/offlineStorage'

const apiUrl = Cypress.env('QA_API_URL') as string
const password = `EditorNoop-${Date.now()}!`
let admin: SupabaseClient
let shared: SupabaseClient
let owner: SupabaseClient
let user: User
let email: string

function App() {
  const controller = useNoteAppController()
  return <><NotesShell controller={controller} /><Toaster /></>
}

function AuthHarness() {
  const [current, setCurrent] = React.useState<User | null>(null)
  React.useEffect(() => {
    const { data: { subscription } } = shared.auth.onAuthStateChange((_event, session) => setCurrent(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])
  if (!current) return <div data-testid="logged-out">Signed out</div>
  return <div data-testid="logged-in" data-user-id={current.id}>
    <SupabaseTestProvider key={current.id} supabase={shared} user={current}><App /></SupabaseTestProvider>
  </div>
}

function login() {
  cy.then({ timeout: 30000 }, async () => {
    const result = await shared.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
  })
  cy.get('[data-testid="logged-in"]').should('have.attr', 'data-user-id', user.id)
}

describe('unchanged note transitions against local Supabase', { retries: 0 }, () => {
  before(() => cy.then({ timeout: 30000 }, async () => {
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    admin = createClient(apiUrl, Cypress.env('QA_SERVICE_KEY') as string, options)
    shared = createClient(apiUrl, Cypress.env('QA_ANON_KEY') as string, options)
    owner = createClient(apiUrl, Cypress.env('QA_ANON_KEY') as string, options)
    email = `editor-noop-${Date.now()}@example.test`
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) throw created.error ?? new Error('Could not create isolated test user')
    user = created.data.user
    const loginResult = await owner.auth.signInWithPassword({ email, password })
    if (loginResult.error) throw loginResult.error
  }))

  after(() => cy.then({ timeout: 30000 }, async () => {
    if (!user) return
    const result = await admin.auth.admin.deleteUser(user.id)
    if (result.error) throw result.error
  }))

  beforeEach(() => {
    cy.viewport(390, 844)
    cy.then(async () => {
      await shared.auth.signOut()
      const result = await admin.from('notes').delete().eq('user_id', user.id)
      if (result.error) throw result.error
      await storage.clearAll()
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true })
      win.dispatchEvent(new win.Event('online'))
    })
  })

  afterEach(() => cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine') }))

  it('does not update an unchanged plain-text note when its editor tab closes', () => {
    const id = crypto.randomUUID()
    let originalUpdatedAt = ''
    const updates: unknown[] = []
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id, user_id: user.id, title: 'Untouched plain note', description: 'Original plain body', tags: [] }).select('updated_at').single()
      if (result.error) throw result.error
      originalUpdatedAt = result.data.updated_at
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      if (req.url.includes(id)) updates.push(req.body)
    })
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Untouched plain note', { timeout: 15000 }).click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').should('contain.text', 'Original plain body')
    cy.get('[data-cy="mobile-tabs-toggle"]').click()
    cy.get('[data-cy="mobile-workspace-tab-close"]').click()
    // Observe beyond the 500ms autosave debounce so a late write cannot pass unnoticed.
    cy.wait(1200)
    cy.then(async () => {
      expect(updates).to.have.length(0)
      const result = await owner.from('notes').select('title,description,updated_at').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data).to.deep.equal({ title: 'Untouched plain note', description: 'Original plain body', updated_at: originalUpdatedAt })
    })
  })

  it('keeps the original body when only the title changes and the note is read', () => {
    const id = crypto.randomUUID()
    const original = '  Original plain body  '
    const updates: unknown[] = []
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id, user_id: user.id, title: 'Title only note', description: original, tags: [] })
      if (result.error) throw result.error
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      if (req.url.includes(id)) updates.push(req.body)
    })
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Title only note', { timeout: 15000 }).click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Changed title')
    cy.get('[data-cy="note-read-button"]').click()
    cy.contains('Changed title', { timeout: 15000 }).should('be.visible')
    cy.wrap(null).should(() => expect(updates.length).to.be.greaterThan(0))
    cy.then(async () => {
      expect(updates).to.satisfy((values: { description?: string }[]) => values.every(value => value.description === original))
      const result = await owner.from('notes').select('title,description').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data).to.deep.equal({ title: 'Changed title', description: original })
    })
  })

  it('does not update an unchanged note when switching from edit to read', () => {
    const id = crypto.randomUUID()
    const updates: unknown[] = []
    let originalUpdatedAt = ''
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id, user_id: user.id, title: 'Read without changes', description: 'Plain text for reading', tags: [] }).select('updated_at').single()
      if (result.error) throw result.error
      originalUpdatedAt = result.data.updated_at
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      if (req.url.includes(id)) updates.push(req.body)
    })
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Read without changes', { timeout: 15000 }).click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').should('contain.text', 'Plain text for reading')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.wait(1200)
    cy.then(async () => {
      expect(updates).to.have.length(0)
      const result = await owner.from('notes').select('description,updated_at').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data).to.deep.equal({ description: 'Plain text for reading', updated_at: originalUpdatedAt })
    })
  })

  it('round-trips multiline plain text through an edit and back from the server', () => {
    const id = crypto.randomUUID()
    const original = 'Первая 😀  < 2 & 7 > 3\r\n\r\n\r\nПоследняя'
    const displayed = original.replaceAll('\r\n', '\n')
    let originalUpdatedAt = ''
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id, user_id: user.id, title: 'Multiline plain note', description: original, tags: [] }).select('updated_at').single()
      if (result.error) throw result.error
      originalUpdatedAt = result.data.updated_at
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patchNote')
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Multiline plain note', { timeout: 15000 }).click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(displayed))
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.wait(1200)
    cy.then(async () => {
      const result = await owner.from('notes').select('description,updated_at').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data).to.deep.equal({ description: original, updated_at: originalUpdatedAt })
    })
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.wait('@patchNote').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.then(async () => {
      const result = await owner.from('notes').select('description').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data.description).to.contain('<br><br><br>')
      expect(result.data.description).to.contain('Последняя!')
    })
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').should(($editor) => expect($editor[0].innerText).to.equal(`${displayed}!`))
  })

  it('shows a readable card preview after saving and reading a multiline note', () => {
    const id = crypto.randomUUID()
    const original = 'First 😀\r\n\r\nTail'
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id, user_id: user.id, title: 'Preview database note', description: original, tags: [] })
      if (result.error) throw result.error
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patchNote')
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Preview database note').find('p').first().should('have.text', 'First 😀 Tail')
    cy.contains('[data-testid="note-card"]', 'Preview database note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.get('.note-content:visible').should(($body) => expect($body[0].innerText).to.equal('First 😀\n\nTail!'))
    cy.wait('@patchNote').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.then(async () => {
      const result = await owner.from('notes').select('description').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data.description).to.equal('<p>First 😀<br><br>Tail!</p>')
    })
    cy.get('[data-cy="note-back-button"]').click()
    cy.contains('[data-testid="note-card"]', 'Preview database note').find('p').first().should('have.text', 'First 😀 Tail!')
  })

  it('shows decoded characters after editing and saving plain text with line breaks', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const result = await owner.from('notes').insert({
        id, user_id: user.id, title: 'Preview characters',
        description: 'Fish & chips > 10\r\n\r\n尾 😀', tags: [],
      })
      if (result.error) throw result.error
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patchNote')
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Preview characters').find('p').first()
      .should('have.text', 'Fish & chips > 10 尾 😀')
    cy.contains('[data-testid="note-card"]', 'Preview characters').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.get('.note-content:visible').should(($body) => expect($body[0].innerText).to.equal('Fish & chips > 10\n\n尾 😀!'))
    cy.wait('@patchNote').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.then(async () => {
      const result = await owner.from('notes').select('description').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data.description).to.equal('<p>Fish &amp; chips &gt; 10<br><br>尾 😀!</p>')
    })
    cy.get('[data-cy="note-back-button"]').click()
    cy.contains('[data-testid="note-card"]', 'Preview characters').find('p').first()
      .should('have.text', 'Fish & chips > 10 尾 😀!')
    cy.screenshot('edited-note-readable-preview')
  })

  it('keeps a literal entity in HTML after editing, reading, and returning to the list', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const result = await owner.from('notes').insert({
        id, user_id: user.id, title: 'Literal entity',
        description: '<p>Literal &amp;amp; &amp;copy=2</p>', tags: [],
      })
      if (result.error) throw result.error
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patchNote')
    cy.mount(<AuthHarness />)
    login()
    cy.contains('[data-testid="note-card"]', 'Literal entity').find('p').first()
      .should('have.text', 'Literal &amp; &copy=2')
    cy.contains('[data-testid="note-card"]', 'Literal entity').click()
    cy.get('.note-content:visible').should('have.text', 'Literal &amp; &copy=2')
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.ProseMirror').click().type('{selectall}{rightarrow}!')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.get('.note-content:visible').should('have.text', 'Literal &amp; &copy=2!')
    cy.wait('@patchNote').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.then(async () => {
      const result = await owner.from('notes').select('description').eq('id', id).single()
      if (result.error) throw result.error
      expect(result.data.description).to.equal('<p>Literal &amp;amp; &amp;copy=2!</p>')
    })
    cy.get('[data-cy="note-back-button"]').click()
    cy.contains('[data-testid="note-card"]', 'Literal entity').find('p').first()
      .should('have.text', 'Literal &amp; &copy=2!')
  })
})
