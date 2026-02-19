import { useState, useCallback } from 'react'
import Toast from 'react-native-toast-message'
import { useDeleteNote } from '@ui/mobile/hooks/useNotes'

export function useBulkDeleteNotes() {
  const { mutateAsync: deleteNote } = useDeleteNote()
  const [isPending, setIsPending] = useState(false)

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return

    setIsPending(true)
    try {
      const results = await Promise.allSettled(ids.map(id => deleteNote(id)))
      const failedCount = results.filter(r => r.status === 'rejected').length
      const successCount = results.filter(r => r.status === 'fulfilled').length
      if (failedCount > 0) {
        Toast.show({
          type: 'error',
          text1: `Could not delete ${failedCount} note${failedCount > 1 ? 's' : ''}`,
        })
      } else if (successCount > 0) {
        Toast.show({
          type: 'success',
          text1: `Deleted ${successCount} note${successCount === 1 ? '' : 's'}`,
        })
      }
    } finally {
      setIsPending(false)
    }
  }, [deleteNote])

  return { bulkDelete, isPending }
}
