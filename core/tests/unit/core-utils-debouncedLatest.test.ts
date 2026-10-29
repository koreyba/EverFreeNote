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

  it('forces one durable retry even when the draft matches the baseline', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })
    debounced.reset('saved')
    debounced.schedule('saved', { force: true })
    await debounced.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith('saved')
    debounced.schedule('saved')
    await debounced.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)
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

  it('does not let an in-flight flush overwrite a rebased baseline', async () => {
    let resolveFlush!: () => void
    const onFlush = jest.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveFlush = resolve
    }))
    const debounced = createDebouncedLatest({
      delayMs: 100,
      onFlush,
      isEqual: (left: { title: string }, right: { title: string }) => left.title === right.title,
    })

    debounced.reset({ title: 'Saved' })
    debounced.schedule({ title: 'Local' })
    const flushPromise = debounced.flush()

    debounced.rebase({ title: 'Remote' })
    resolveFlush()

    await flushPromise

    expect(debounced.getBaseline()).toEqual({ title: 'Remote' })
    expect(debounced.getPending()).toBeNull()
  })

  it('waits for newer edits made while a previous write is in flight', async () => {
    let finishFirst!: () => void
    let finishLatest!: () => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve }))
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishLatest = resolve }))
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })

    debounced.schedule('first')
    const firstWrite = debounced.flush()
    debounced.schedule('latest')
    let transitionFinished = false
    const transition = debounced.flush().then(() => { transitionFinished = true })

    finishFirst()
    await jest.advanceTimersByTimeAsync(0)
    expect(onFlush).toHaveBeenCalledTimes(2)
    expect(onFlush).toHaveBeenLastCalledWith('latest')
    expect(transitionFinished).toBe(false)

    finishLatest()
    await Promise.all([firstWrite, transition])
    expect(transitionFinished).toBe(true)
    expect(debounced.getBaseline()).toBe('latest')
    expect(debounced.getPending()).toBeNull()
  })

  it('persists a return to the previous baseline while another value is saving', async () => {
    let finishFirst!: () => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce(undefined)
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })

    debounced.reset('original')
    debounced.schedule('changed')
    const firstWrite = debounced.flush()
    debounced.schedule('original')
    const transition = debounced.flush()
    finishFirst()
    await Promise.all([firstWrite, transition])

    expect(onFlush.mock.calls.map(([value]) => value)).toEqual(['changed', 'original'])
    expect(debounced.getBaseline()).toBe('original')
  })

  it('rejects a transition if the newer queued write fails', async () => {
    let finishFirst!: () => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve }))
      .mockRejectedValueOnce(new Error('Latest save failed'))
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })

    debounced.schedule('first')
    const firstWrite = debounced.flush()
    const firstResult = firstWrite.catch(() => undefined)
    debounced.schedule('latest')
    const transition = debounced.flush()
    finishFirst()

    await expect(transition).rejects.toThrow('Latest save failed')
    await firstResult
    expect(debounced.getPending()).toBe('latest')
  })

  it('retries a return to the baseline after an earlier write partially fails', async () => {
    let failFirst!: (error: Error) => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { failFirst = reject }))
      .mockResolvedValueOnce(undefined)
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })

    debounced.reset('original')
    debounced.schedule('changed')
    const firstWrite = debounced.flush()
    const firstResult = firstWrite.catch(() => undefined)
    debounced.schedule('original')
    const transition = debounced.flush()
    failFirst(new Error('Queue unavailable'))
    await expect(transition).rejects.toThrow('Queue unavailable')
    await firstResult
    await debounced.flush()

    expect(onFlush.mock.calls.map(([value]) => value)).toEqual(['changed', 'original'])
    expect(debounced.getPending()).toBeNull()
  })

  it('does not retry a failed write from a session that has been reset', async () => {
    let failFirst!: (error: Error) => void
    const onFlush = jest.fn().mockImplementation(() => new Promise<void>((_, reject) => { failFirst = reject }))
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })

    debounced.schedule('old note')
    const write = debounced.flush()
    debounced.reset('new note')
    failFirst(new Error('Old write failed'))

    await expect(write).rejects.toThrow('Old write failed')
    await jest.advanceTimersByTimeAsync(100)
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(debounced.getPending()).toBeNull()
    expect(debounced.getBaseline()).toBe('new note')
  })

  it('does not retry an older in-flight failure after a newer write is confirmed', async () => {
    let failOld!: (error: Error) => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { failOld = reject }))
      .mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })
    debounced.reset('original')
    debounced.schedule('older')
    const oldResult = debounced.flush().catch(() => undefined)
    debounced.rebase('manual', null, { supersedeInFlight: true })
    failOld(new Error('Old write failed'))
    await oldResult
    await jest.advanceTimersByTimeAsync(100)
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(debounced.getPending()).toBeNull()
    expect(debounced.getBaseline()).toBe('manual')
  })

  it('keeps newer pending edits when superseding an older in-flight failure', async () => {
    let failOld!: (error: Error) => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { failOld = reject }))
      .mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<string>({ delayMs: 100, onFlush })
    debounced.reset('original')
    debounced.schedule('older')
    const oldResult = debounced.flush().catch(() => undefined)
    debounced.schedule('latest')
    debounced.rebase('manual', 'latest', { supersedeInFlight: true })
    failOld(new Error('Old write failed'))
    await oldResult
    await debounced.flush()
    expect(onFlush.mock.calls.map(([value]) => value)).toEqual(['older', 'latest'])
    expect(debounced.getBaseline()).toBe('latest')
  })
})
