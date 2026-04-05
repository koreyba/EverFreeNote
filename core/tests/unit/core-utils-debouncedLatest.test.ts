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
})
