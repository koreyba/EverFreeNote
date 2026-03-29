import { useState, useCallback } from 'react'

export type ViewMode = 'note' | 'chunk'

interface SearchModeState {
  isAIEnabled: boolean
  viewMode: ViewMode
}

const STORAGE_KEY = 'everfreenote:aiSearchMode'

function loadState(): SearchModeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isAIEnabled: false, viewMode: 'note' }
    const parsed = JSON.parse(raw) as Partial<SearchModeState>
    return {
      isAIEnabled: parsed.isAIEnabled === true,
      viewMode: parsed.viewMode === 'chunk' ? 'chunk' : 'note',
    }
  } catch {
    return { isAIEnabled: false, viewMode: 'note' }
  }
}

function saveState(state: SearchModeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings) — ignore
  }
}

export function useSearchMode() {
  const [state, setState] = useState<SearchModeState>(loadState)

  const setIsAIEnabled = useCallback((enabled: boolean) => {
    setState((prev) => {
      const next = { ...prev, isAIEnabled: enabled }
      saveState(next)
      return next
    })
  }, [])

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setState((prev) => {
      const next = { ...prev, viewMode }
      saveState(next)
      return next
    })
  }, [])

  return {
    isAIEnabled: state.isAIEnabled,
    viewMode: state.viewMode,
    setIsAIEnabled,
    setViewMode,
  }
}
