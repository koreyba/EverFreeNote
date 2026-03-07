import { useCallback, useRef, useState } from 'react'

export function useBulkDeleteConfirm(onConfirmDelete: () => Promise<void> | void) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const confirmingRef = useRef(false)

  const requestDelete = useCallback(() => {
    setError(null)
    setIsDialogOpen(true)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    setError(null)
    try {
      await onConfirmDelete()
      setIsDialogOpen(false)
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Bulk delete confirmation failed')
      setError(normalizedError)
    } finally {
      confirmingRef.current = false
    }
  }, [onConfirmDelete])

  return {
    isDialogOpen,
    setIsDialogOpen,
    requestDelete,
    confirmDelete,
    error,
    clearError,
  }
}
