import { createDebouncedLatest } from '@core/utils/debouncedLatest'

describe('createDebouncedLatest', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('rebases the baseline without dropping a merged pending draft', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string; tags: string[] }, right: { title: string; tags: string[] }) => (
        left.title === right.title &&
        left.tags.join('|') === right.tags.join('|')
      ),
    })

    debounced.reset({ title: 'Saved', tags: ['a'] })
    debounced.schedule({ title: 'Local', tags: ['a'] })
    debounced.rebase(
      { title: 'Remote', tags: ['b'] },
      { title: 'Local', tags: ['b'] }
    )

    expect(debounced.getPending()).toEqual({ title: 'Local', tags: ['b'] })

    await jest.advanceTimersByTimeAsync(100)

    expect(onFlush).toHaveBeenCalledWith({ title: 'Local', tags: ['b'] })
  })

  it('clears pending work when rebasing onto a clean draft', () => {
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush: jest.fn(),
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.reset({ title: 'Saved' })
    debounced.schedule({ title: 'Local' })
    debounced.rebase({ title: 'Remote' }, { title: 'Remote' })

    expect(debounced.getPending()).toBeNull()
  })

  it('updates the debouncer baseline before an async flush resolves', async () => {
    let resolveFlush!: () => void
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush: () => new Promise<void>((resolve) => {
        resolveFlush = resolve
      }),
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.schedule({ title: 'Saved' })

    await jest.advanceTimersByTimeAsync(100)

    expect(debounced.getBaseline()).toEqual({ title: 'Saved' })

    resolveFlush()
  })

  it('cancels pending work and prevents the timer from flushing', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.schedule({ title: 'Local' })
    debounced.cancel()

    await jest.advanceTimersByTimeAsync(100)

    expect(debounced.getPending()).toBeNull()
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('uses the reset baseline for future equality checks', () => {
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush: jest.fn(),
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.reset({ title: 'Saved' })
    debounced.schedule({ title: 'Saved' })

    expect(debounced.getPending()).toBeNull()
  })

  it('rolls back the baseline when flush fails', async () => {
    const onFlush = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.schedule({ title: 'Saved' })
    await debounced.flush()
    debounced.schedule({ title: 'Broken' })

    await expect(debounced.flush()).rejects.toThrow('boom')
    expect(debounced.getBaseline()).toEqual({ title: 'Saved' })
  })

  it('does not queue a value that already matches the current baseline', () => {
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush: jest.fn(),
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.reset({ title: 'Saved' })
    debounced.schedule({ title: 'Saved' })

    expect(debounced.getPending()).toBeNull()
  })
})
