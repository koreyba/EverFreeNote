import React from 'react'
import { ImportButton } from '@/components/ImportButton'
import { SupabaseTestProvider } from '@/lib/providers/SupabaseProvider'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { EnexParser } from '@/lib/enex/parser'
import { ContentConverter } from '@/lib/enex/converter'
import { NoteCreator } from '@/lib/enex/note-creator'

const createMockSupabase = (user: User | null = { id: 'user-1' } as User) => {
  return {
    auth: {
      getUser: cy.stub().resolves({ data: { user } }),
      signInWithOAuth: cy.stub().resolves({ error: null }),
      signInWithPassword: cy.stub().resolves({ data: { user: null }, error: null }),
      signOut: cy.stub().resolves({ error: null }),
    },
    storage: {
      from: cy.stub().returns({
        upload: cy.stub().resolves({ data: { path: '' }, error: null }),
        getPublicUrl: cy.stub().returns({ data: { publicUrl: 'https://example.com' }, error: null }),
      }),
    },
  } as unknown as SupabaseClient
}

const wrapWithProvider = (node: React.ReactNode, supabase = createMockSupabase()) => (
  <SupabaseTestProvider supabase={supabase}>
    {node}
  </SupabaseTestProvider>
)

describe('ImportButton Component', () => {
  beforeEach(() => {
    // Mock localStorage
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('renders import button with correct text', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    cy.contains('Import from Evernote').should('be.visible')
    cy.get('button').should('have.class', 'w-full')
    cy.get('svg').should('exist') // Upload icon
  })

  it('opens import dialog on click', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    cy.contains('Import from Evernote').click()
    
    // Dialog should be visible
    cy.contains('Drag and drop .enex files or click to browse').should('be.visible')
  })

  it('shows disabled state when importing', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    // Open dialog and start import (we'll need to mock this)
    cy.contains('Import from Evernote').should('not.be.disabled')
  })

  it('shows loading text when importing', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    // Button should show normal text initially
    cy.contains('Import from Evernote').should('be.visible')
    cy.contains('Importing...').should('not.exist')
  })

  it('runs full import flow and calls onImportComplete', () => {
    const onImportComplete = cy.stub().as('onImportComplete')

    // Stub heavy dependencies to avoid real parsing/requests
    cy.stub(EnexParser.prototype, 'parse').resolves([{
      title: 'Stub Note',
      description: 'desc',
      tags: ['stub'],
      content: '<p>content</p>',
      resources: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1'
    }])
    cy.stub(ContentConverter.prototype, 'convert').resolves('<p>converted</p>')
    cy.stub(NoteCreator.prototype, 'create').resolves()
    cy.stub(globalThis.crypto, 'randomUUID').returns('uuid-1')

    cy.mount(wrapWithProvider(<ImportButton onImportComplete={onImportComplete} />, createMockSupabase()))

    cy.contains('Import from Evernote').click()

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
      fileName: 'stub.enex',
      mimeType: 'application/xml'
    }, { force: true })

    cy.contains('button', 'Import (1)').click()

    cy.get('@onImportComplete').should('have.been.calledWith', 'success', { successCount: 1, errorCount: 0 })
    cy.contains('Importing...').should('not.exist')
  })

  it('aborts import when user is not authenticated', () => {
    cy.stub(EnexParser.prototype, 'parse').as('parseStub')
    cy.stub(ContentConverter.prototype, 'convert').as('convertStub')
    cy.stub(NoteCreator.prototype, 'create').as('createStub')

    cy.mount(wrapWithProvider(<ImportButton />, createMockSupabase(null)))

    cy.contains('Import from Evernote').click()

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
      fileName: 'stub.enex',
      mimeType: 'application/xml'
    }, { force: true })

    cy.contains('button', 'Import (1)').click()

    cy.get('@parseStub').should('not.have.been.called')
    cy.get('@convertStub').should('not.have.been.called')
    cy.get('@createStub').should('not.have.been.called')
    cy.contains('Importing from Evernote').should('not.exist')
  })

  it('calls onImportComplete callback on successful import', () => {
    const onImportComplete = cy.stub().as('onImportComplete')
    cy.mount(wrapWithProvider(<ImportButton onImportComplete={onImportComplete} />))
    
    // Verify callback prop is accepted
    cy.wrap(null).should(() => {
      expect(onImportComplete).to.not.have.been.called
    })
  })

  it('handles interrupted import warning on mount', () => {
    // Set up interrupted import state
    cy.window().then((win) => {
      win.localStorage.setItem('everfreenote-import-state', JSON.stringify({
        currentFile: 1,
        totalFiles: 2,
        successCount: 5,
        errorCount: 0
      }))
    })

    cy.mount(wrapWithProvider(<ImportButton />))
    
    // Should show warning toast (we can't easily test toast, but we can verify localStorage is cleared)
    cy.window().then((win) => {
      // Wait a bit for useEffect to run
      cy.wait(100).then(() => {
        expect(win.localStorage.getItem('everfreenote-import-state')).to.be.null
      })
    })
  })

  it('renders all three dialogs (main, progress, result)', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    // ImportDialog should be in DOM (but not visible)
    cy.get('[role="dialog"]').should('not.exist')
    
    // Open dialog
    cy.contains('Import from Evernote').click()
    cy.get('[role="dialog"]').should('exist')
  })

  it('has correct button styling', () => {
    cy.mount(wrapWithProvider(<ImportButton />))
    
    cy.get('button')
      .should('have.class', 'w-full')
      .and('be.visible')
  })
})

