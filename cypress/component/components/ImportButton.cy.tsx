import React from 'react'
import { ImportButton } from '@/components/ImportButton'
import { browser } from '@/lib/adapters/browser'
import { SupabaseTestProvider } from '@/lib/providers/SupabaseProvider'
import { EnexParser } from '@/lib/enex/parser'

// Helper type for Sinon stubs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

describe('ImportButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any

  const validEnexContent = `<?xml version="1.0" encoding="UTF-8"?>
<en-export export-date="20230101T000000Z" application="Evernote" version="10.0">
  <note>
    <title>Test Note</title>
    <content>
      <![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <en-note><div>Test Content</div></en-note>]]>
    </content>
    <created>20230101T000000Z</created>
    <updated>20230101T000000Z</updated>
  </note>
</en-export>`

  let mockQueryBuilder: {
    select: SinonStub,
    insert: SinonStub,
    update: SinonStub,
    eq: SinonStub,
    single: SinonStub,
    then: (resolve: (value: unknown) => void) => void
  }

  beforeEach(() => {
    cy.spy(console, 'log').as('consoleLog')
    cy.spy(console, 'error').as('consoleError')

    // Stub EnexParser.prototype.parse
    const parseStub = EnexParser.prototype.parse as unknown as SinonStub
    if (!parseStub.restore) {
        cy.stub(EnexParser.prototype, 'parse').resolves([
            {
              title: 'Test Note',
              content: '<div>Test Content</div>',
              created: new Date('2023-01-01T00:00:00Z'),
              updated: new Date('2023-01-01T00:00:00Z'),
              tags: [],
              resources: []
            }
          ])
    } else {
        parseStub.resetHistory();
        parseStub.resolves([
            {
              title: 'Test Note',
              content: '<div>Test Content</div>',
              created: new Date('2023-01-01T00:00:00Z'),
              updated: new Date('2023-01-01T00:00:00Z'),
              tags: [],
              resources: []
            }
          ])
    }

    // Mock Supabase Query Builder
    mockQueryBuilder = {
      select: cy.stub(),
      insert: cy.stub(),
      update: cy.stub(),
      eq: cy.stub(),
      single: cy.stub(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) // Default resolve for list (handleDuplicate)
    }
    
    // Chainable returns
    mockQueryBuilder.select.returns(mockQueryBuilder)
    mockQueryBuilder.insert.returns(mockQueryBuilder)
    mockQueryBuilder.update.returns(mockQueryBuilder)
    mockQueryBuilder.eq.returns(mockQueryBuilder)
    mockQueryBuilder.single.resolves({ data: { id: 'new-note-id' }, error: null })

    // Mock Supabase Client
    mockSupabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'test-user-id' } } }),
      },
      storage: {
        from: cy.stub().returns({
          upload: cy.stub().resolves({ data: { path: 'test-path' }, error: null }),
          getPublicUrl: cy.stub().returns({ data: { publicUrl: 'http://test-url' } }),
        }),
      },
      from: cy.stub().returns(mockQueryBuilder),
    }

    // Mock browser.localStorage
    const getItemStub = browser.localStorage.getItem as unknown as SinonStub
    if (!getItemStub.restore) {
        cy.stub(browser.localStorage, 'getItem').returns(null)
    } else {
        getItemStub.resetHistory();
        getItemStub.returns(null);
    }

    const setItemStub = browser.localStorage.setItem as unknown as SinonStub
    if (!setItemStub.restore) {
        cy.stub(browser.localStorage, 'setItem')
    } else {
        setItemStub.resetHistory();
    }

    const removeItemStub = browser.localStorage.removeItem as unknown as SinonStub
    if (!removeItemStub.restore) {
        cy.stub(browser.localStorage, 'removeItem')
    } else {
        removeItemStub.resetHistory();
    }
  })

  it('renders the import button', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton />
      </SupabaseTestProvider>
    )
    cy.contains('Import .enex file').should('be.visible')
  })

  it('opens the dialog when clicked', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton />
      </SupabaseTestProvider>
    )
    cy.contains('Import .enex file').click()
    cy.contains('Drag and drop .enex files').should('be.visible')
  })

  it('performs import successfully', () => {
    const onImportComplete = cy.spy().as('onImportComplete')
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton onImportComplete={onImportComplete} />
      </SupabaseTestProvider>
    )

    // Open dialog
    cy.contains('Import .enex file').click()

    // Select file
    const file = new File([validEnexContent], 'notes.enex', { type: 'application/xml' })
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'notes.enex',
      mimeType: 'application/xml'
    }, { force: true })

    // Click Import inside the dialog
    cy.get('[role="dialog"] button').contains('Import').click()

    // Check if getUser was called
    cy.wrap(mockSupabase.auth.getUser).should('have.been.called')

    // Check for errors
    cy.get('@consoleError').should((spy: unknown) => {
        const consoleSpy = spy as SinonStub
        if (consoleSpy.called) {
            const calls = consoleSpy.getCalls()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const relevantCalls = calls.filter((call: any) => {
                const msg = call.args[0] || ''
                return typeof msg === 'string' && !msg.includes('webpack-dev-server')
            })
            if (relevantCalls.length > 0) {
                const args = relevantCalls[0].args
                throw new Error(`Console error called with: ${args.join(' ')}`)
            }
        }
    })

    // Wait for completion
    cy.contains('Successfully imported 1 note', { timeout: 10000 }).should('be.visible')
    
    // Check if onImportComplete was called
    cy.get('@onImportComplete').should('have.been.calledWith', 'success', { successCount: 1, errorCount: 0 })

    // Check if localStorage was cleaned up
    cy.wrap(browser.localStorage.removeItem).should('have.been.calledWith', 'everfreenote-import-state')
  })

  it('handles import errors gracefully', () => {
    // Mock insert failure
    mockQueryBuilder.single.rejects(new Error('Database error'))

    const onImportComplete = cy.spy().as('onImportComplete')
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton onImportComplete={onImportComplete} />
      </SupabaseTestProvider>
    )

    cy.contains('Import .enex file').click()

    const file = new File([validEnexContent], 'notes.enex', { type: 'application/xml' })
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'notes.enex',
      mimeType: 'application/xml'
    }, { force: true })

    cy.get('[role="dialog"] button').contains('Import').click()

    // Should show error in result
    cy.contains('All imports failed').should('be.visible')
    
    // Check failed notes list
    cy.contains('Test Note').should('be.visible')
    cy.contains('Database error').should('be.visible')
  })

  it('restores state from localStorage', () => {
    const savedState = JSON.stringify({
      successCount: 5,
      errorCount: 1,
      totalNotes: 10,
    })
    
    // Mock getItem to return saved state
    ;(browser.localStorage.getItem as unknown as SinonStub).returns(savedState)

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton />
      </SupabaseTestProvider>
    )

    // Should show toast warning
    // Since we can't easily check toast, we can check if removeItem was called (it cleans up after showing toast)
    cy.wrap(browser.localStorage.removeItem).should('have.been.calledWith', 'everfreenote-import-state')
  })

  it('validates file size', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton maxFileSize={10} />
      </SupabaseTestProvider>
    )
    cy.contains('Import .enex file').click()

    // Create a file larger than 10 bytes
    // const file = new File(['some content larger than 10 bytes'], 'test.enex', { type: 'application/xml' })

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('some content larger than 10 bytes'),
      fileName: 'test.enex',
      mimeType: 'application/xml'
    }, { force: true })

    cy.get('[role="dialog"] button').contains('Import').click()

    // Should show error toast (we can't see toast easily, but we can check that import didn't start)
    // We can check that mockSupabase.auth.getUser was NOT called
    cy.wrap(mockSupabase.auth.getUser).should('not.have.been.called')
  })

  it('closes progress dialog', () => {
    const onImportComplete = cy.spy().as('onImportComplete')
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton onImportComplete={onImportComplete} />
      </SupabaseTestProvider>
    )

    // Open dialog
    cy.contains('Import .enex file').click()

    // Select file
    const file = new File([validEnexContent], 'notes.enex', { type: 'application/xml' })
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'notes.enex',
      mimeType: 'application/xml'
    }, { force: true })

    // Click Import inside the dialog
    cy.get('[role="dialog"] button').contains('Import').click()

    // Wait for completion
    cy.contains('Successfully imported 1 note', { timeout: 10000 }).should('be.visible')

    // Click Close button in progress dialog
    cy.contains('button', 'Close').click()

    // Progress dialog should be closed (not visible)
    cy.contains('Import Progress').should('not.exist')
  })

  it('requires user to be logged in', () => {
    mockSupabase.auth.getUser.resolves({ data: { user: null } })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ImportButton />
      </SupabaseTestProvider>
    )
    cy.contains('Import .enex file').click()

    const file = new File([validEnexContent], 'notes.enex', { type: 'application/xml' })
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'notes.enex',
      mimeType: 'application/xml'
    }, { force: true })

    cy.get('[role="dialog"] button').contains('Import').click()

    // Should not proceed to parsing
    // We can check if parser was instantiated? No.
    // We can check if insert was called.
    cy.wrap(mockSupabase.from).should('not.have.been.called')
  })
})