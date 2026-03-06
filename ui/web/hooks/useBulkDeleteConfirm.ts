import { useCallback, useRef, useState } from 'react'

export function useBulkDeleteConfirm(onConfirmDelete: () => Promise<void> | void) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const confirmingRef = useRef(false)

  const requestDelete = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    try {
      await onConfirmDelete()
    } catch (error) {
      console.error('Bulk delete confirmation failed:', error)
    } finally {
      confirmingRef.current = false
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
