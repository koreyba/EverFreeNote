import type { SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseForExportDialog() {
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
