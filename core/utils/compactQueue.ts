import type { MutationQueueItem, MutationStatus, MutationOperation } from '../types/offline'

type Op = MutationOperation

const isTagMutation = (operation: Op): boolean => (
  operation === 'renameTag' || operation === 'deleteTag'
)

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
    const compacted = compactNoteOperations(ops)
    if (compacted) result.push(compacted)
  }

  // Сортировка по clientUpdatedAt, чтобы сохранить общий порядок выполнения
  return result.sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
}

const compactNoteOperations = (operations: MutationQueueItem[]): MutationQueueItem | null => {
  const sorted = [...operations].sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  // Bulk tag operations have their own idempotent replay semantics and must
  // not be collapsed into ordinary note create/update/delete operations.
  if (sorted.some((operation) => isTagMutation(operation.operation))) {
    return withPendingStatus(last)
  }

  const hasCreate = sorted.some((operation) => operation.operation === 'create')
  const hasDelete = sorted.some((operation) => operation.operation === 'delete')

  // A create followed by a delete never needs to reach the server.
  if (hasCreate && hasDelete) return null

  if (hasCreate) {
    return withPendingStatus({
      ...first,
      operation: 'create',
      payload: last.payload,
      clientUpdatedAt: last.clientUpdatedAt,
      id: last.id,
    })
  }

  if (last.operation === 'delete' || last.operation === 'update') {
    return withPendingStatus(last)
  }

  return null
}

const withPendingStatus = (item: MutationQueueItem): MutationQueueItem => ({
  ...item,
  status: 'pending' as MutationStatus,
})
