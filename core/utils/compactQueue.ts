import type { MutationQueueItem, MutationStatus, MutationOperation } from '../types/offline'

type Op = MutationOperation

/**
 * Сжимает очередь мутаций для одной и той же заметки, сводя цепочку операций к минимально
 * необходимому набору для отправки на сервер.
 *
 * Правила:
 * 1) create + delete (с любыми промежуточными update) -> ничего не делаем (noop).
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
    const sorted = [...ops].sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const hasCreate = sorted.some((o) => o.operation === 'create')
    const hasDelete = sorted.some((o) => o.operation === 'delete')
    const lastOp: Op = last.operation

    // 1) create + delete => noop
    if (hasCreate && hasDelete) {
      continue
    }

    // 2) delete без create => оставить delete
    if (!hasCreate && lastOp === 'delete') {
      result.push(withPendingStatus(last))
      continue
    }

    // 3) create (+ updates) => один create с финальным payload
    if (hasCreate && !hasDelete) {
      result.push(
        withPendingStatus({
          ...first,
          operation: 'create',
          payload: last.payload,
          clientUpdatedAt: last.clientUpdatedAt,
          id: last.id,
        })
      )
      continue
    }

    // 4) update (+ updates) => один update с финальным payload
    if (!hasCreate && !hasDelete && lastOp === 'update') {
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
