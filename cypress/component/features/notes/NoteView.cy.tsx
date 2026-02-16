import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NoteView } from '../../../../ui/web/components/features/notes/NoteView'
import type { Note } from '../../../../core/types/domain'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const createSupabaseForExportDialog = () => {
  const invoke = cy.stub().callsFake((name: string, params: { body: { action?: string } }) => {
    if (name === 'wordpress-settings-status') {
      return Promise.resolve({
        data: {
          configured: true,
          integration: {
            siteUrl: 'https://stage.dkoreiba.com/',
            wpUsername: 'editor',
            enabled: true,
            hasPassword: true,
          },
        },
        error: null,
      })
    }
    if (name === 'wordpress-bridge' && params.body.action === 'get_categories') {
      return Promise.resolve({
        data: {
          categories: [{ id: 1, name: 'Tech' }],
          rememberedCategoryIds: [],
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })

  const supabase = {
    functions: { invoke },
    auth: {
      getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } } }),
    },
    from: cy.stub().returns({
      upsert: cy.stub().resolves({ error: null }),
      update: cy.stub().returnsThis(),
      eq: cy.stub().resolves({ error: null }),
    }),
  } as unknown as SupabaseClient

  return { supabase, invoke }
}

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

    cy.contains('Delete').click()
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

  it('shows export button when WordPress is configured', () => {
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: true,
    }

    cy.mount(<NoteView {...props} />)
    cy.contains('button', 'Export to WP').should('be.visible')
  })

  it('shows mobile more-actions menu instead of visible export button', () => {
    cy.viewport(390, 844)

    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: true,
    }

    cy.mount(<NoteView {...props} />)
    cy.contains('button', 'Export to WP').should('not.be.visible')
    cy.get('button[aria-label="More actions"]').should('be.visible')
  })

  it('opens export dialog from mobile menu and closes menu content', () => {
    cy.viewport(390, 844)

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

  it('hides export button when WordPress is not configured', () => {
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub(),
      wordpressConfigured: false,
    }

    cy.mount(<NoteView {...props} />)
    cy.contains('button', 'Export to WP').should('not.exist')
  })
})
