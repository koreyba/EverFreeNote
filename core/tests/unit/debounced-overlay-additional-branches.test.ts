import { createDebouncedLatest } from "@core/utils/debouncedLatest"
import { applyNoteOverlay } from "@core/utils/overlay"

type Draft = { title: string; version: number }

describe("createDebouncedLatest additional branches", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("makes an empty flush and a repeated flush no-ops", async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<Draft>({ delayMs: 100, onFlush })

    await debounced.flush()
    debounced.schedule({ title: "Saved", version: 1 })
    await debounced.flush()
    await debounced.flush()

    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(debounced.getPending()).toBeNull()
    expect(debounced.getBaseline()).toEqual({ title: "Saved", version: 1 })
  })

  it("uses Object.is by default and a custom equality function when provided", () => {
    const onFlush = jest.fn()
    const sameReference = { title: "Saved", version: 1 }
    const defaultEquality = createDebouncedLatest({ delayMs: 100, onFlush })

    defaultEquality.reset(sameReference)
    defaultEquality.schedule(sameReference)
    expect(defaultEquality.getPending()).toBeNull()
    defaultEquality.schedule({ title: "Saved", version: 1 })
    expect(defaultEquality.getPending()).toEqual({ title: "Saved", version: 1 })

    const valueEquality = createDebouncedLatest<Draft>({
      delayMs: 100,
      onFlush,
      isEqual: (left, right) => left.title === right.title && left.version === right.version,
    })
    valueEquality.reset({ title: "Saved", version: 1 })
    valueEquality.schedule({ title: "Saved", version: 1 })

    expect(valueEquality.getPending()).toBeNull()
  })

  it("flushes immediately and cancels the scheduled timer without a duplicate save", async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<Draft>({
      delayMs: 100,
      onFlush,
      isEqual: (left, right) => left.title === right.title && left.version === right.version,
    })

    debounced.schedule({ title: "Local", version: 1 })
    await debounced.flush()
    await jest.advanceTimersByTimeAsync(100)

    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(debounced.getPending()).toBeNull()
  })

  it("reset cancels pending work and rebasing without a replacement keeps it", async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined)
    const debounced = createDebouncedLatest<Draft>({ delayMs: 100, onFlush })

    debounced.schedule({ title: "Discarded", version: 1 })
    debounced.reset({ title: "Remote", version: 2 })
    await jest.advanceTimersByTimeAsync(100)
    expect(onFlush).not.toHaveBeenCalled()
    expect(debounced.getBaseline()).toEqual({ title: "Remote", version: 2 })

    debounced.schedule({ title: "Local", version: 3 })
    debounced.rebase({ title: "Refreshed", version: 4 })
    expect(debounced.getBaseline()).toEqual({ title: "Refreshed", version: 4 })
    expect(debounced.getPending()).toEqual({ title: "Local", version: 3 })

    await jest.advanceTimersByTimeAsync(100)
    expect(onFlush).toHaveBeenCalledWith({ title: "Local", version: 3 })
  })

  it("preserves a different pending value while the first flush is in flight", async () => {
    let resolveFirst!: () => void
    const onFlush = jest.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce(undefined)
    const debounced = createDebouncedLatest<Draft>({ delayMs: 100, onFlush })

    debounced.schedule({ title: "First", version: 1 })
    const firstFlush = debounced.flush()
    debounced.schedule({ title: "Second", version: 2 })

    expect(debounced.getPending()).toEqual({ title: "Second", version: 2 })
    resolveFirst()
    await firstFlush
    expect(debounced.getBaseline()).toEqual({ title: "First", version: 1 })

    await jest.advanceTimersByTimeAsync(100)
    expect(onFlush).toHaveBeenCalledTimes(2)
    expect(onFlush).toHaveBeenLastCalledWith({ title: "Second", version: 2 })
    expect(debounced.getBaseline()).toEqual({ title: "Second", version: 2 })
    expect(debounced.getPending()).toBeNull()
  })

  it("does not duplicate a pending value equal to the in-flight value", async () => {
    let resolveFlush!: () => void
    const onFlush = jest.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveFlush = resolve }))
    const debounced = createDebouncedLatest<Draft>({
      delayMs: 100,
      onFlush,
      isEqual: (left, right) => left.title === right.title && left.version === right.version,
    })
    const value = { title: "Same", version: 1 }

    debounced.schedule(value)
    const flushPromise = debounced.flush()
    debounced.schedule({ ...value })
    resolveFlush()
    await flushPromise
    await jest.advanceTimersByTimeAsync(100)

    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(debounced.getPending()).toBeNull()
  })
})

const serverNote = (overrides: Record<string, unknown> = {}) => ({
  id: "server-note",
  title: "Server title",
  description: "Server description",
  tags: ["server"],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  user_id: "user-1",
  ...overrides,
})

describe("applyNoteOverlay additional branches", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-01-10T00:00:00.000Z"))
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("removes deleted notes and overlays existing notes while preserving fallback fields", () => {
    const result = applyNoteOverlay(
      [
        serverNote({ id: "existing" }),
        serverNote({ id: "deleted" }),
      ] as never,
      [
        { id: "deleted", status: "pending", updatedAt: "2026-01-04T00:00:00.000Z", deleted: true },
        { id: "existing", status: "pending", updatedAt: "2026-01-05T00:00:00.000Z", title: "Local title" },
      ] as never,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "existing",
      title: "Local title",
      description: "Server description",
      tags: ["server"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-05T00:00:00.000Z",
      user_id: "user-1",
    })
  })

  it("creates new notes with explicit fields, fallback fields, and updated_at sorting", () => {
    const result = applyNoteOverlay(
      [serverNote({ id: "old", updated_at: undefined, created_at: "2026-01-01T00:00:00.000Z" })] as never,
      [
        {
          id: "new-explicit",
          status: "pending",
          updatedAt: "2026-01-12T00:00:00.000Z",
          title: "Explicit title",
          description: "Explicit description",
          tags: ["local"],
        },
        {
          id: "new-fallback",
          status: "pending",
          updatedAt: undefined,
          title: undefined,
          description: undefined,
          tags: undefined,
        },
      ] as never,
    )

    expect(result.map((note) => note.id)).toEqual(["new-explicit", "new-fallback", "old"])
    expect(result[0]).toMatchObject({
      id: "new-explicit",
      title: "Explicit title",
      description: "Explicit description",
      tags: ["local"],
      updated_at: "2026-01-12T00:00:00.000Z",
      created_at: "2026-01-10T00:00:00.000Z",
      user_id: "",
    })
    expect(result[1]).toMatchObject({
      id: "new-fallback",
      title: "Untitled",
      description: "",
      tags: [],
      updated_at: "2026-01-10T00:00:00.000Z",
      created_at: "2026-01-10T00:00:00.000Z",
      user_id: "",
    })
  })
})
