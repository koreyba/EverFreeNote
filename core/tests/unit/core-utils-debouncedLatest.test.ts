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

  it('retries an in-flight value if the flush fails after the same payload is re-queued', async () => {
    let rejectFlush!: (error: Error) => void
    const onFlush = jest.fn().mockImplementation(() => new Promise<void>((_, reject) => {
      rejectFlush = reject
    }))
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.schedule({ title: 'Saved' })
    const flushPromise = debounced.flush()
    debounced.schedule({ title: 'Saved' })

    rejectFlush(new Error('boom'))

    await expect(flushPromise).rejects.toThrow('boom')
    expect(debounced.getPending()).toEqual({ title: 'Saved' })

    onFlush.mockResolvedValueOnce(undefined)
    await jest.advanceTimersByTimeAsync(100)

    expect(onFlush).toHaveBeenCalledTimes(2)
    expect(debounced.getBaseline()).toEqual({ title: 'Saved' })
    expect(debounced.getPending()).toBeNull()
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

  it('keeps the original debounce deadline when rebasing pending work', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.schedule({ title: 'Local' })

    await jest.advanceTimersByTimeAsync(50)

    debounced.rebase({ title: 'Remote' }, { title: 'Local' })

    await jest.advanceTimersByTimeAsync(49)
    expect(onFlush).not.toHaveBeenCalled()

    await jest.advanceTimersByTimeAsync(1)
    expect(onFlush).toHaveBeenCalledWith({ title: 'Local' })
  })
})
