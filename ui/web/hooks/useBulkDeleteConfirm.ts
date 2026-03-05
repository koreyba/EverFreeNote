import { useCallback, useState } from 'react'

export function useBulkDeleteConfirm(onConfirmDelete: () => Promise<void> | void) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const requestDelete = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    try {
      await onConfirmDelete()
    } finally {
      setIsDialogOpen(false)
    }
  }, [onConfirmDelete])

  return {
    isDialogOpen,
    setIsDialogOpen,
    requestDelete,
    confirmDelete,
  }
}
