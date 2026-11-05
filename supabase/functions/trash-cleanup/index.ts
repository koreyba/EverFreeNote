import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1'
import {
  createTrashMediaCleanupHandler,
  type MediaClaim,
} from '../../../core/services/trashMediaCleanup.ts'

const url = Deno.env.get('SUPABASE_URL')
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  Deno.serve(() =>
    Response.json({ error: 'Cleanup is not configured' }, { status: 503 }),
  )
} else {
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(10000),
        }),
    },
  })
  Deno.serve(
    createTrashMediaCleanupHandler({
      cronSecret: Deno.env.get('TRASH_CLEANUP_SECRET'),
      userForToken: async (token) => {
        const { data, error } = await admin.auth.getUser(token)
        return error ? null : (data.user?.id ?? null)
      },
      claim: async (owner) => {
        const { data, error } = await admin.rpc('claim_trash_media_cleanup', {
          p_owner: owner,
        })
        if (error) throw error
        return data as MediaClaim[]
      },
      remove: async (paths) => {
        const { error } = await admin.storage.from('note-images').remove(paths)
        if (error) throw error
      },
      complete: async (claims, success) => {
        const { error } = await admin.rpc(
          'complete_trash_media_cleanup_batch',
          { p_claims: claims, p_success: success },
        )
        if (error) throw error
      },
    }),
  )
}
