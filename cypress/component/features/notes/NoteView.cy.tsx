import React from 'react'
import { NoteView } from '../../../../ui/web/components/features/notes/NoteView'
import type { Note } from '../../../../core/types/domain'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import { createSupabaseForExportDialog } from './noteTestHelpers'

describe('NoteView Component', () => {
  const mockNote: Note & { content?: string | null } = {
    id: '1',
    title: 'Test Note',
    description: '<p>Test Content</p>',
    tags: ['tag1', 'tag2'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user1'
  }

  it('renders note details correctly', () => {
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub()
    }
    cy.mount(<NoteView {...props} />)

    cy.contains('Test Note').should('be.visible')
    cy.contains('Test Content').should('be.visible')
    cy.contains('tag1').should('be.visible')
    cy.contains('tag2').should('be.visible')
    cy.contains('Created:').should('be.visible')
    cy.contains('Updated:').should('be.visible')
  })

  it('handles actions', () => {
    const onEdit = cy.spy().as('onEdit')
    const onDelete = cy.spy().as('onDelete')
    const onTagClick = cy.spy().as('onTagClick')
    const onRemoveTag = cy.spy().as('onRemoveTag')

    const props = {
      note: mockNote,
      onEdit,
      onDelete,
      onTagClick,
      onRemoveTag
    }

    cy.mount(
      <NoteView
        {...props}
      />
    )

    cy.contains('Edit').click()
    cy.get('@onEdit').should('have.been.called')

    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('@onDelete').should('have.been.called')

    // Test tag interaction if InteractiveTag supports it
    // Assuming InteractiveTag has click handlers
    cy.contains('tag1').click()
    // Note: InteractiveTag implementation might require specific selector for click vs remove
  })

  it('sanitizes content', () => {
    const maliciousNote = {
      ...mockNote,
      description: '<script>alert("xss")</script><p>Safe Content</p>'
    }

    const props = {
      note: maliciousNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub()
    }

    cy.mount(<NoteView {...props} />)

    cy.contains('Safe Content').should('be.visible')
    // Scope the check to the content area to avoid finding Next.js/Cypress scripts
    cy.get('.prose script').should('not.exist')
  })

  it('more actions menu is always visible', () => {
    // The "..." button is always present — it holds RAG controls (and optionally WP export)
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: false,
    }
    cy.mount(<NoteView {...props} />)
    cy.get('button[aria-label="More actions"]').should('be.visible')
  })

  it('more actions menu is visible on mobile too', () => {
    cy.viewport(390, 844)
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
    }
    cy.mount(<NoteView {...props} />)
    cy.get('button[aria-label="More actions"]').should('be.visible')
  })

  it('shows RAG index controls inside the more actions menu', () => {
    const { supabase } = createSupabaseForExportDialog()
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
    }
    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <NoteView {...props} />
      </SupabaseTestProvider>
    )
    cy.get('button[aria-label="More actions"]').click()
    // RAG items always present in the menu
    cy.contains('[role="menuitem"]', 'Index note').should('be.visible')
    cy.get('[data-cy="note-delete-index-button"]').should('be.visible')
  })

  it('shows WordPress export inside the more actions menu when configured', () => {
    const { supabase } = createSupabaseForExportDialog()
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: true,
    }
    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <NoteView {...props} />
      </SupabaseTestProvider>
    )
    // WP export is no longer an inline header button
    cy.contains('button', 'Export to WP').should('not.exist')
    // It lives in the "..." menu
    cy.get('button[aria-label="More actions"]').click()
    cy.contains('[role="menuitem"]', 'Export to WP').should('be.visible')
  })

  it('opens export dialog from the more actions menu', () => {
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: true,
    }

    const { supabase, invoke } = createSupabaseForExportDialog()

    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <NoteView {...props} />
      </SupabaseTestProvider>
    )

    cy.get('button[aria-label="More actions"]').click()
    cy.contains('[role="menuitem"]', 'Export to WP').click()

    cy.contains('[role="menuitem"]', 'Export to WP').should('not.exist')
    cy.contains('Export to WordPress').should('be.visible')
    cy.wrap(invoke).should('have.been.calledWith', 'wordpress-bridge', {
      body: { action: 'get_categories' },
    })
  })

  it('does not show WordPress export in menu when not configured', () => {
    const { supabase } = createSupabaseForExportDialog()
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: false,
    }
    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <NoteView {...props} />
      </SupabaseTestProvider>
    )
    cy.get('button[aria-label="More actions"]').click()
    cy.contains('[role="menuitem"]', 'Export to WP').should('not.exist')
  })
})
