import { createTrashMediaCleanupHandler } from '@core/services/trashMediaCleanup'

const owner = '11111111-1111-4111-8111-111111111111'
const claim = { object_path: `${owner}/note/image.png`, lease_id: 'lease' }
const dependencies = () => ({
  cronSecret: 'synthetic-cron-secret',
  userForToken: jest.fn().mockResolvedValue(owner),
  claim: jest.fn().mockResolvedValue([claim]),
  remove: jest.fn().mockResolvedValue(undefined),
  complete: jest.fn().mockResolvedValue(undefined),
})

describe('Trash media cleanup HTTP boundary', () => {
  it('rejects unauthenticated deletion without claiming files', async () => {
    const deps = dependencies()
    const response = await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', { method: 'POST' }),
    )
    expect(response.status).toBe(401)
    expect(deps.claim).not.toHaveBeenCalled()
  })

  it('uses the verified user and ignores a caller-supplied owner', async () => {
    const deps = dependencies()
    const response = await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer synthetic-user' },
        body: JSON.stringify({ owner: 'another-user' }),
      }),
    )
    expect(response.status).toBe(200)
    expect(deps.claim).toHaveBeenCalledWith(owner)
    expect(deps.remove).toHaveBeenCalledWith([claim.object_path])
    expect(deps.complete).toHaveBeenCalledWith([claim], true)
  })

  it('allows global work only with the configured scheduler secret', async () => {
    const deps = dependencies()
    await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', {
        method: 'POST',
        headers: { 'x-trash-cleanup-secret': 'synthetic-cron-secret' },
      }),
    )
    expect(deps.claim).toHaveBeenCalledWith(null)
    expect(deps.userForToken).not.toHaveBeenCalled()
  })

  it('retains failed Storage deletions for a durable retry', async () => {
    const deps = dependencies()
    deps.remove.mockRejectedValue(new Error('Storage temporarily unavailable'))
    const response = await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer synthetic-user' },
      }),
    )
    expect(response.status).toBe(503)
    expect(deps.complete).toHaveBeenCalledWith([claim], false)
  })

  it('rejects a claim outside the verified user scope', async () => {
    const deps = dependencies()
    deps.claim.mockResolvedValue([
      {
        ...claim,
        object_path: '22222222-2222-4222-8222-222222222222/other/image.png',
      },
    ])
    const response = await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer synthetic-user' },
      }),
    )
    expect(response.status).toBe(503)
    expect(deps.remove).not.toHaveBeenCalled()
  })

  it('refuses an oversized claim batch before calling Storage', async () => {
    const deps = dependencies()
    deps.claim.mockResolvedValue(Array.from({ length: 101 }, () => claim))
    const response = await createTrashMediaCleanupHandler(deps)(
      new Request('https://local.test', {
        method: 'POST',
        headers: { Authorization: 'Bearer synthetic-user' },
      }),
    )
    expect(response.status).toBe(503)
    expect(deps.remove).not.toHaveBeenCalled()
  })
})
