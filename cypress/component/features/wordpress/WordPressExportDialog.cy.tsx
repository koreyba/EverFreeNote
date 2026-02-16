import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import { WordPressExportDialog } from '../../../../ui/web/components/features/wordpress/WordPressExportDialog'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

type InvokePayload = {
  action: string
  noteId?: string
  categoryIds?: number[]
  tags?: string[]
  slug?: string
  status?: string
}

const note = {
  id: 'note-1',
  title: 'Привет мир',
  description: '<p>Body</p>',
  tags: ['work', 'ideas'],
}

const mountDialog = (supabase: SupabaseClient) => {
  cy.mount(
    <SupabaseTestProvider supabase={supabase}>
      <WordPressExportDialog
        open
        onOpenChange={cy.stub()}
        note={note}
      />
    </SupabaseTestProvider>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

const createSupabaseForDialog = ({
  invoke,
  upsert = cy.stub().resolves({ error: null }),
  update = cy.stub().returnsThis(),
  eq = cy.stub().resolves({ error: null }),
}: {
  invoke: SinonStub
  upsert?: SinonStub
  update?: SinonStub
  eq?: SinonStub
}) => {
  const from = cy.stub().callsFake((table: string) => {
    if (table === 'wordpress_export_preferences') {
      return { upsert }
    }
    if (table === 'notes') {
      return { update, eq }
    }
    return {}
  })

  return {
    supabase: {
      functions: { invoke },
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } } }),
      },
      from,
    } as unknown as SupabaseClient,
    stubs: { from, upsert, update, eq },
  }
}

describe('features/wordpress/WordPressExportDialog', () => {
  it('loads categories and preselects remembered ids', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [
              { id: 1, name: 'Tech' },
              { id: 2, name: 'Life' },
            ],
            rememberedCategoryIds: [2],
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const { supabase } = createSupabaseForDialog({ invoke })

    mountDialog(supabase)

    cy.contains('Tech').should('be.visible')
    cy.contains('Life').should('be.visible')
    cy.wrap(invoke).should('have.been.calledWith', 'wordpress-bridge', {
      body: { action: 'get_categories' },
    })
    cy.wrap(invoke).should('have.been.calledWith', 'wordpress-settings-status', {
      body: {},
    })
    cy.contains('label', 'Life').find('[role="checkbox"]').should('have.attr', 'data-state', 'checked')
    cy.contains('label', 'Tech').find('[role="checkbox"]').should('have.attr', 'data-state', 'unchecked')
  })

  it('persists category preference when selection changes', () => {
    const upsert = cy.stub().resolves({ error: null })
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [
              { id: 1, name: 'Tech' },
              { id: 2, name: 'Life' },
            ],
            rememberedCategoryIds: [2],
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const { supabase } = createSupabaseForDialog({ invoke, upsert })

    mountDialog(supabase)

    cy.contains('label', 'Tech').find('[role="checkbox"]').click()

    cy.wrap(upsert).should('have.been.called')
    cy.wrap(upsert).then((stub) => {
      const firstCallArgs = stub.getCall(0).args
      expect(firstCallArgs[0]).to.deep.include({ user_id: 'user-1' })
      expect(firstCallArgs[0].remembered_category_ids).to.satisfy(
        (ids: number[]) => Array.isArray(ids) && ids.includes(1) && ids.includes(2)
      )
      expect(firstCallArgs[1]).to.deep.equal({ onConflict: 'user_id' })
    })
  })

  it('edits export tags without mutating source note tags and submits with overrides', () => {
    const originalTags = [...note.tags]
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [],
            rememberedCategoryIds: [],
          },
          error: null,
        })
      }

      if (name === 'wordpress-bridge' && params.body.action === 'export_note') {
        return Promise.resolve({
          data: {
            postId: 10,
            postUrl: 'https://example.com/post/10',
            slug: params.body.slug,
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const update = cy.stub().returnsThis()
    const eq = cy.stub().resolves({ error: null })
    const { supabase } = createSupabaseForDialog({ invoke, update, eq })

    mountDialog(supabase)

    cy.get('button[aria-label="Remove tag work"]').click()
    cy.get('input[placeholder="Add tag"]').type('draft{enter}')
    cy.contains('button', 'Export').click()

    cy.wrap(invoke).should(
      'have.been.calledWith',
      'wordpress-bridge',
      Cypress.sinon.match({
        body: Cypress.sinon.match((body: InvokePayload) => {
          return (
            body.action === 'export_note' &&
            body.noteId === 'note-1' &&
            body.status === 'publish' &&
            Array.isArray(body.tags) &&
            body.tags.includes('ideas') &&
            body.tags.includes('draft') &&
            !body.tags.includes('work')
          )
        }),
      })
    )

    expect(note.tags).to.deep.equal(originalTags)
    cy.wrap(update).should('have.been.calledWith', {
      tags: ['work', 'ideas', 'stage.dkoreiba.com_published'],
    })
    cy.wrap(eq).should('have.been.calledWith', 'id', 'note-1')
    cy.contains('Post published (ID: 10).').should('be.visible')
  })

  it('does not update note with published tag when checkbox is disabled', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [],
            rememberedCategoryIds: [],
          },
          error: null,
        })
      }

      if (name === 'wordpress-bridge' && params.body.action === 'export_note') {
        return Promise.resolve({
          data: {
            postId: 11,
            postUrl: 'https://example.com/post/11',
            slug: params.body.slug,
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const update = cy.stub().returnsThis()
    const { supabase } = createSupabaseForDialog({ invoke, update })

    mountDialog(supabase)

    cy.contains('Add published tag to the note').should('be.visible')
    cy.get('#wp-add-published-tag').click()
    cy.contains('button', 'Export').click()

    cy.wrap(update).should('not.have.been.called')
    cy.contains('Post published (ID: 11).').should('be.visible')
  })

  it('shows inline slug validation error before submit', () => {
    const invoke = cy.stub().callsFake((name: string) => {
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
      return Promise.resolve({
        data: {
          categories: [],
          rememberedCategoryIds: [],
        },
        error: null,
      })
    })

    const { supabase } = createSupabaseForDialog({ invoke })

    mountDialog(supabase)

    cy.get('input#wp-export-slug').clear()
    cy.contains('button', 'Export').click()

    cy.contains('Slug is required.').should('be.visible')
    cy.wrap(invoke).should('have.callCount', 2)
    cy.wrap(invoke).then((stub) => {
      const calledExportNote = stub
        .getCalls()
        .some((call: { args: unknown[] }) => {
          const args = call.args as [string, { body?: InvokePayload }]
          return args[0] === 'wordpress-bridge' && args[1]?.body?.action === 'export_note'
        })
      expect(calledExportNote).to.equal(false)
    })
  })

  it('shows warning when post published but note tag update fails', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [],
            rememberedCategoryIds: [],
          },
          error: null,
        })
      }
      if (name === 'wordpress-bridge' && params.body.action === 'export_note') {
        return Promise.resolve({
          data: {
            postId: 12,
            postUrl: 'https://example.com/post/12',
            slug: params.body.slug,
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const update = cy.stub().returnsThis()
    const eq = cy.stub().resolves({ error: { message: 'RLS blocked update' } })
    const { supabase } = createSupabaseForDialog({ invoke, update, eq })

    mountDialog(supabase)

    cy.contains('button', 'Export').click()
    cy.contains('Post published, but failed to update note tag: RLS blocked update').should('be.visible')
    cy.contains('Post published (ID: 12).').should('be.visible')
  })

  it('hides published-tag checkbox when site url is unavailable', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
      if (name === 'wordpress-settings-status') {
        return Promise.resolve({
          data: {
            configured: true,
            integration: {
              siteUrl: '',
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
            categories: [],
            rememberedCategoryIds: [],
          },
          error: null,
        })
      }
      if (name === 'wordpress-bridge' && params.body.action === 'export_note') {
        return Promise.resolve({
          data: {
            postId: 13,
            postUrl: 'https://example.com/post/13',
            slug: params.body.slug,
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const update = cy.stub().returnsThis()
    const { supabase } = createSupabaseForDialog({ invoke, update })

    mountDialog(supabase)

    cy.contains('Add published tag to the note').should('not.exist')
    cy.contains('button', 'Export').click()
    cy.wrap(update).should('not.have.been.called')
    cy.contains('Post published (ID: 13).').should('be.visible')
  })

  it('renders bridge export error inside the dialog', () => {
    const invoke = cy.stub().callsFake((name: string, params: { body: InvokePayload }) => {
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
            categories: [],
            rememberedCategoryIds: [],
          },
          error: null,
        })
      }

      if (name === 'wordpress-bridge' && params.body.action === 'export_note') {
        return Promise.resolve({
          data: null,
          error: {
            context: {
              json: async () => ({
                code: 'slug_conflict',
                message: 'Slug already exists',
              }),
            },
          },
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const update = cy.stub().returnsThis()
    const { supabase } = createSupabaseForDialog({ invoke, update })

    mountDialog(supabase)

    cy.contains('button', 'Export').click()
    cy.contains('Slug already exists').should('be.visible')
    cy.wrap(update).should('not.have.been.called')
  })
})
