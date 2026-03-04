import { useState, useCallback } from 'react'
import type { SearchPreset } from '@core/constants/aiSearch'
import { DEFAULT_PRESET } from '@core/constants/aiSearch'

export type ViewMode = 'note' | 'chunk'

interface SearchModeState {
  isAIEnabled: boolean
  preset: SearchPreset
  viewMode: ViewMode
}

const STORAGE_KEY = 'everfreenote:aiSearchMode'

function loadState(): SearchModeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isAIEnabled: false, preset: DEFAULT_PRESET, viewMode: 'note' }
    const parsed = JSON.parse(raw) as Partial<SearchModeState>
    return {
      isAIEnabled: parsed.isAIEnabled === true,
      preset: (['strict', 'neutral', 'broad'] as SearchPreset[]).includes(parsed.preset as SearchPreset)
        ? (parsed.preset as SearchPreset)
        : DEFAULT_PRESET,
      viewMode: parsed.viewMode === 'chunk' ? 'chunk' : 'note',
    }
  } catch {
    return { isAIEnabled: false, preset: DEFAULT_PRESET, viewMode: 'note' }
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

  const setPreset = useCallback((preset: SearchPreset) => {
    setState((prev) => {
      const next = { ...prev, preset }
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
    preset: state.preset,
    viewMode: state.viewMode,
    setIsAIEnabled,
    setPreset,
    setViewMode,
  }
}
