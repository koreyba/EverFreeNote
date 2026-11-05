import type { MutationQueueItem, MutationStatus, MutationOperation } from '../types/offline'
import type { Note } from '../types/domain'

type Op = MutationOperation

/**
 * Сжимает очередь мутаций для одной и той же заметки, сводя цепочку операций к минимально
 * необходимому набору для отправки на сервер.
 *
 * Правила:
 * 1) create + delete (с любыми промежуточными update) -> delete: create мог уже
 *    успешно выполниться на сервере, даже если ответ потерялся.
 * 2) create + update(s) -> один create с последним payload.
 * 3) update + update(s) -> один update с последним payload.
 * 4) update/delete без create, где последняя операция delete -> один delete.
 * 5) update/delete без create, где последняя операция update -> один update.
 *
 * Входная очередь может содержать элементы с разными статусами; на выходе все помечаются
 * как pending, т.к. компактер формирует новый набор для повторной синхронизации.
 */
export function compactQueue(items: MutationQueueItem[]): MutationQueueItem[] {
  const byNote = new Map<string, MutationQueueItem[]>()
  for (const item of items) {
    const list = byNote.get(item.noteId) ?? []
    list.push(item)
    byNote.set(item.noteId, list)
  }

  const result: MutationQueueItem[] = []

  for (const ops of byNote.values()) {
    const sorted = [...ops].sort((a, b) => {
      const byTime = Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt)
      if (byTime) return byTime
      // IndexedDB may return equal-time entries in arbitrary ID order.
      return Number(a.operation === 'delete') - Number(b.operation === 'delete')
    })
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const hasCreate = sorted.some((o) => o.operation === 'create')
    const lastOp: Op = last.operation

    // Never merge operations that explicitly belong to different accounts.
    const owners = new Set(sorted.map(ownerId).filter((owner): owner is string => Boolean(owner)))
    if (owners.size > 1) {
      result.push(...sorted.map(withPendingStatus))
      continue
    }

    // A create may have reached the server despite an error or lost response.
    // Preserve the known owner even for legacy deletes that omitted it.
    if (lastOp === 'delete') {
      const owner = owners.values().next().value
      // Deletion is now recoverable: keep the last complete draft until Trash acknowledges it.
      const content = sorted.reduce<MutationQueueItem['payload']>((payload, op) => ({ ...payload, ...op.payload }), {})
      const payload = owner ? { ...content, user_id: owner } : content
      result.push(withPendingStatus({ ...last, payload }))
      continue
    }

    // 3) create (+ updates) => один create с финальным payload
    if (hasCreate) {
      result.push(
        withPendingStatus({
          ...first,
          operation: 'create',
          payload: { ...first.payload, ...last.payload },
          clientUpdatedAt: last.clientUpdatedAt,
          id: last.id,
        })
      )
      continue
    }

    // 4) update/delete без create, где последняя операция update => один update
    // с финальным payload. This also preserves an update that follows a delete.
    if (!hasCreate && lastOp === 'update') {
      result.push(
        withPendingStatus({
          ...last,
          operation: 'update',
        })
      )
    }
  }

  // Сортировка по clientUpdatedAt, чтобы сохранить общий порядок выполнения
  return result.sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
}

const withPendingStatus = (item: MutationQueueItem): MutationQueueItem => ({
  ...item,
  status: 'pending' as MutationStatus,
})

const ownerId = (item: MutationQueueItem): string | undefined =>
  item.payload.user_id ?? (item.payload as { userId?: string }).userId

/** The durable queue is the local Trash until the server acknowledges the snapshot. */
export function buildTrashPayload(
  note: Partial<Note> & { id: string; content?: string | null }, owner: string, queue: MutationQueueItem[],
): MutationQueueItem['payload'] {
  const related = queue.filter(item => item.noteId === note.id).sort((a,b) => Date.parse(a.clientUpdatedAt)-Date.parse(b.clientUpdatedAt))
  if ((note.user_id && note.user_id !== owner) || related.some(item => ownerId(item) && ownerId(item) !== owner)) {
    throw new Error('The note belongs to another account.')
  }
  const payload: MutationQueueItem['payload'] = { ...note, description: note.description ?? note.content ?? undefined }
  for (const item of related) {
    for (const [key,value] of Object.entries(item.payload)) if (value !== undefined) Object.assign(payload,{ [key]: value })
  }
  if (typeof payload.title !== 'string' || typeof payload.description !== 'string' || !Array.isArray(payload.tags)) {
    throw new Error('The complete note content could not be preserved. Keep the local snapshot and retry.')
  }
  return { ...payload, id: note.id, user_id: owner, ...(related.some(item => item.operation==='create') ? { locally_created: true } : {}) }
}
