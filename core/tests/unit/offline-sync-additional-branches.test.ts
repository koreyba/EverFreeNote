import { OfflineSyncManager } from "@core/services/offlineSyncManager"
import type {
  MutationQueueItem,
  NetworkStatusProvider,
  OfflineStorageAdapter,
} from "@core/types/offline"

const makeItem = (
  id: string,
  overrides: Partial<MutationQueueItem> = {},
): MutationQueueItem => ({
  id,
  noteId: `note-${id}`,
  operation: "update",
  payload: { title: id },
  clientUpdatedAt: `2026-01-01T00:00:0${id}Z`,
  status: "pending",
  ...overrides,
})

class DeterministicStorage implements OfflineStorageAdapter {
  queue: MutationQueueItem[] = []
  readonly getQueue = jest.fn(async () => this.queue)
  readonly upsertQueue = jest.fn(async (items: MutationQueueItem[]) => {
    this.queue = [...items]
  })
  readonly upsertQueueItem = jest.fn(async (item: MutationQueueItem) => {
    this.queue.push(item)
  })
  readonly getPendingBatch = jest.fn(async (batchSize: number) => (
    this.queue.filter((item) => item.status === "pending").slice(0, batchSize)
  ))
  readonly removeQueueItems = jest.fn(async (ids: string[]) => {
    this.queue = this.queue.filter((item) => !ids.includes(item.id))
  })
  readonly markQueueItemStatus = jest.fn(async (id: string, status: MutationQueueItem["status"], lastError?: string) => {
    const item = this.queue.find((entry) => entry.id === id)
    if (item) Object.assign(item, { status, lastError })
  })

  async loadNotes() { return [] }
  async saveNote() {}
  async saveNotes() {}
  async deleteNote() {}
  async popQueueBatch(size: number) { return this.getPendingBatch(size) }
  async markSynced() {}
  async enforceLimit() {}
  async clearAll() { this.queue = [] }
}

const makeNetwork = (initialOnline: boolean) => {
  let listener: ((online: boolean) => void) | undefined
  const unsubscribe = jest.fn(() => {
    listener = undefined
  })
  const network: NetworkStatusProvider & { emit: (online: boolean) => void; unsubscribe: jest.Mock } = {
    isOnline: jest.fn(() => initialOnline),
    subscribe: jest.fn((callback: (online: boolean) => void) => {
      listener = callback
      return unsubscribe
    }),
    emit: (online: boolean) => listener?.(online),
    unsubscribe,
  }
  return network
}

const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve()
  }
}

describe("OfflineSyncManager additional branches", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("transitions from offline to online, records state, and disposes the network subscription", async () => {
    const storage = new DeterministicStorage()
    storage.queue = [makeItem("1")]
    const network = makeNetwork(false)
    const performSync = jest.fn().mockResolvedValue(undefined)
    const manager = new OfflineSyncManager(storage, performSync, network)

    await manager.drainQueue()
    expect(performSync).not.toHaveBeenCalled()
    await expect(manager.getState()).resolves.toMatchObject({ isOnline: false, queueSize: 1 })

    await manager.handleOnline()
    expect(performSync).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }))
    await expect(manager.getState()).resolves.toMatchObject({ isOnline: true, queueSize: 0 })
    expect((await manager.getState()).lastSyncAt).toEqual(expect.any(String))

    manager.handleOffline()
    await expect(manager.getState()).resolves.toMatchObject({ isOnline: false })
    manager.dispose()
    expect(network.unsubscribe).toHaveBeenCalledTimes(1)

    storage.queue = [makeItem("2")]
    network.emit(true)
    await flushMicrotasks()
    expect(performSync).toHaveBeenCalledTimes(1)
  })

  it("compacts create-delete to a noop and keeps a standalone delete pending", async () => {
    const storage = new DeterministicStorage()
    storage.queue = [
      makeItem("create", {
        noteId: "same-note",
        operation: "create",
        clientUpdatedAt: "2026-01-01T00:00:01Z",
      }),
      makeItem("delete", {
        noteId: "same-note",
        operation: "delete",
        clientUpdatedAt: "2026-01-01T00:00:02Z",
      }),
      makeItem("update", {
        noteId: "deleted-note",
        operation: "update",
        clientUpdatedAt: "2026-01-01T00:00:03Z",
      }),
      makeItem("final-delete", {
        noteId: "deleted-note",
        operation: "delete",
        clientUpdatedAt: "2026-01-01T00:00:04Z",
        status: "failed",
      }),
    ]
    const performSync = jest.fn().mockResolvedValue(undefined)
    const manager = new OfflineSyncManager(storage, performSync, makeNetwork(false))

    await manager.handleOnline()

    expect(storage.upsertQueue).toHaveBeenCalledWith([
      expect.objectContaining({ id: "final-delete", operation: "delete", status: "pending" }),
    ])
    expect(performSync).toHaveBeenCalledTimes(1)
    expect(performSync).toHaveBeenCalledWith(expect.objectContaining({ id: "final-delete", operation: "delete" }))
    expect(storage.queue).toEqual([])
  })

  it("recovers after compaction storage failure because draining is reset", async () => {
    const storage = new DeterministicStorage()
    storage.queue = [makeItem("1")]
    storage.upsertQueue.mockRejectedValueOnce(new Error("storage unavailable"))
    const manager = new OfflineSyncManager(storage, jest.fn().mockResolvedValue(undefined), makeNetwork(false))

    await expect(manager.handleOnline()).rejects.toThrow("storage unavailable")
    expect(storage.getPendingBatch).not.toHaveBeenCalled()

    storage.upsertQueue.mockImplementationOnce(async (items) => { storage.queue = [...items] })
    await expect(manager.drainQueue()).resolves.toBeUndefined()
    expect(storage.getPendingBatch).toHaveBeenCalled()
  })

  it("marks failed syncs, tolerates mark errors, and stops when no progress is made", async () => {
    const storage = new DeterministicStorage()
    storage.queue = [makeItem("failed")]
    storage.markQueueItemStatus.mockRejectedValueOnce(new Error("status write failed"))
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const manager = new OfflineSyncManager(storage, jest.fn().mockRejectedValue("transport down"), makeNetwork(false))

    await expect(manager.handleOnline()).resolves.toBeUndefined()

    expect(storage.markQueueItemStatus).toHaveBeenCalledWith("failed", "failed", "Unknown sync error")
    expect(warn).toHaveBeenCalledWith("Failed to mark item status as failed:", expect.any(Error))
    expect(storage.removeQueueItems).not.toHaveBeenCalled()
    expect(storage.queue).toHaveLength(1)
  })

  it("continues after cleanup and onSuccess failures once sync itself succeeds", async () => {
    const storage = new DeterministicStorage()
    storage.queue = [makeItem("success")]
    storage.removeQueueItems.mockRejectedValueOnce(new Error("cleanup failed"))
    storage.getPendingBatch
      .mockResolvedValueOnce([makeItem("success")])
      .mockResolvedValueOnce([])
    const onSuccess = jest.fn().mockRejectedValue(new Error("callback failed"))
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const manager = new OfflineSyncManager(
      storage,
      jest.fn().mockResolvedValue(undefined),
      makeNetwork(false),
      onSuccess,
    )

    await expect(manager.handleOnline()).resolves.toBeUndefined()

    expect(storage.removeQueueItems).toHaveBeenCalledWith(["success"])
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: "success" }))
    expect(warn).toHaveBeenCalledWith(
      "Failed to remove item from offline queue after successful sync:",
      expect.any(Error),
    )
    expect(warn).toHaveBeenCalledWith("onSuccess callback error (sync was successful):", expect.any(Error))
  })

  it("stops fetching later batches after going offline during a drain", async () => {
    const storage = new DeterministicStorage()
    storage.queue = Array.from({ length: 11 }, (_, index) => makeItem(String(index + 1)))
    const managerRef: { current?: OfflineSyncManager } = {}
    const performSync = jest.fn(async (item: MutationQueueItem) => {
      if (item.id === "1") managerRef.current?.handleOffline()
    })
    const manager = new OfflineSyncManager(storage, performSync, makeNetwork(false))
    managerRef.current = manager

    await manager.handleOnline()

    expect(performSync).toHaveBeenCalledTimes(10)
    expect(storage.getPendingBatch).toHaveBeenCalledWith(10)
    await expect(manager.getState()).resolves.toMatchObject({ isOnline: false, queueSize: 1 })
  })

  it("does not start a second drain while the first drain is in flight", async () => {
    let release!: () => void
    const storage = new DeterministicStorage()
    storage.queue = [makeItem("1")]
    const performSync = jest.fn().mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))
    const manager = new OfflineSyncManager(storage, performSync, makeNetwork(false))

    const firstDrain = manager.handleOnline()
    await flushMicrotasks()
    const secondDrain = manager.drainQueue()

    await expect(secondDrain).resolves.toBeUndefined()
    expect(performSync).toHaveBeenCalledTimes(1)
    release()
    await firstDrain
    expect(storage.removeQueueItems).toHaveBeenCalledWith(["1"])
  })
})
