import { useState, useCallback } from 'react'

interface BulkSelectionState {
  isActive: boolean
  selectedIds: Set<string>
}

interface UseBulkSelectionReturn extends BulkSelectionState {
  activate: (id: string) => void
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
  deactivate: () => void
}

export function useBulkSelection(): UseBulkSelectionReturn {
  const [isActive, setIsActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const activate = useCallback((id: string) => {
    setIsActive(true)
    setSelectedIds(new Set([id]))
  }, [])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const deactivate = useCallback(() => {
    setIsActive(false)
    setSelectedIds(new Set())
  }, [])

  return { isActive, selectedIds, activate, toggle, selectAll, clear, deactivate }
}
