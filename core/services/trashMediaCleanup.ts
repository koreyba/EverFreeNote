export type MediaClaim = { object_path: string; lease_id: string }
export type TrashMediaCleanupDeps = {
  cronSecret?: string
  userForToken: (token: string) => Promise<string | null>
  claim: (owner: string | null) => Promise<MediaClaim[]>
  remove: (paths: string[]) => Promise<void>
  complete: (claims: MediaClaim[], success: boolean) => Promise<void>
}
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
export function createTrashMediaCleanupHandler(deps: TrashMediaCleanupDeps) {
  return async (request: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers })
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers })
    if (request.method !== 'POST')
      return json({ error: 'Method not allowed' }, 405)
    try {
      const scheduled = Boolean(
        deps.cronSecret &&
          request.headers.get('x-trash-cleanup-secret') === deps.cronSecret,
      )
      const token = request.headers
        .get('authorization')
        ?.match(/^Bearer\s+(.+)$/i)?.[1]
      const owner = scheduled
        ? null
        : token
          ? await deps.userForToken(token)
          : null
      if (!scheduled && !owner) return json({ error: 'Unauthorized' }, 401)
      const claims = await deps.claim(owner)
      if (
        claims.length > 100 ||
        claims.some(
          (row) =>
            !row.lease_id ||
            !/^[\da-f-]{36}\//i.test(row.object_path) ||
            (owner && !row.object_path.startsWith(`${owner}/`)),
        )
      )
        throw new Error('Invalid media cleanup scope')
      if (!claims.length) return json({ removed: 0 })
      try {
        await deps.remove(claims.map((row) => row.object_path))
      } catch {
        await deps.complete(claims, false)
        return json({ error: 'File cleanup is pending and will retry.' }, 503)
      }
      await deps.complete(claims, true)
      return json({ removed: claims.length })
    } catch {
      return json(
        { error: 'Cleanup could not finish. It will retry later.' },
        503,
      )
    }
  }
}
