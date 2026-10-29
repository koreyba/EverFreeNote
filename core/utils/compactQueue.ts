import type { MutationQueueItem, MutationStatus, MutationOperation } from '../types/offline'

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
      const payload = owner ? { ...last.payload, user_id: owner } : last.payload
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
