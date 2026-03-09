import { useCallback, useEffect, useRef, useState } from 'react'
import { asyncStorageAdapter } from '@ui/mobile/adapters'
import type { SearchPreset } from '@core/constants/aiSearch'
import { DEFAULT_PRESET } from '@core/constants/aiSearch'

export type MobileSearchViewMode = 'note' | 'chunk'

type MobileSearchModeState = {
  isAIEnabled: boolean
  preset: SearchPreset
  viewMode: MobileSearchViewMode
}

const STORAGE_KEY = 'everfreenote:mobileAiSearchMode'
const DEFAULT_STATE: MobileSearchModeState = {
  isAIEnabled: false,
  preset: DEFAULT_PRESET,
  viewMode: 'note',
}

function parseState(raw: string | null): MobileSearchModeState {
  if (!raw) return DEFAULT_STATE

  try {
    const parsed = JSON.parse(raw) as Partial<MobileSearchModeState>
    return {
      isAIEnabled: parsed.isAIEnabled === true,
      preset: (['strict', 'neutral', 'broad'] as SearchPreset[]).includes(parsed.preset as SearchPreset)
        ? (parsed.preset as SearchPreset)
        : DEFAULT_PRESET,
      viewMode: parsed.viewMode === 'chunk' ? 'chunk' : 'note',
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function useMobileSearchMode() {
  const [state, setState] = useState<MobileSearchModeState>(DEFAULT_STATE)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let active = true

    void asyncStorageAdapter.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return
      setState(parseState(raw))
      hasLoadedRef.current = true
    })

    return () => {
      active = false
    }
  }, [])

  const persistState = useCallback((next: MobileSearchModeState) => {
    if (!hasLoadedRef.current) return
    void asyncStorageAdapter.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const updateState = useCallback((updater: (prev: MobileSearchModeState) => MobileSearchModeState) => {
    setState((prev) => {
      const next = updater(prev)
      persistState(next)
      return next
    })
  }, [persistState])

  const setIsAIEnabled = useCallback((enabled: boolean) => {
    updateState((prev) => ({ ...prev, isAIEnabled: enabled }))
  }, [updateState])

  const setPreset = useCallback((preset: SearchPreset) => {
    updateState((prev) => ({ ...prev, preset }))
  }, [updateState])

  const setViewMode = useCallback((viewMode: MobileSearchViewMode) => {
    updateState((prev) => ({ ...prev, viewMode }))
  }, [updateState])

  return {
    isAIEnabled: state.isAIEnabled,
    preset: state.preset,
    viewMode: state.viewMode,
    setIsAIEnabled,
    setPreset,
    setViewMode,
  }
}
