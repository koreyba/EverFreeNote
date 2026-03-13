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
const VALID_PRESETS: SearchPreset[] = ['strict', 'neutral', 'broad']
const DEFAULT_STATE: MobileSearchModeState = {
  isAIEnabled: false,
  preset: DEFAULT_PRESET,
  viewMode: 'note',
}

function serializeState(state: MobileSearchModeState): string {
  return JSON.stringify(state)
}

function parseState(raw: string | null): MobileSearchModeState {
  if (!raw) return DEFAULT_STATE

  try {
    const parsed = JSON.parse(raw) as Partial<MobileSearchModeState>
    return {
      isAIEnabled: parsed.isAIEnabled === true,
      preset: VALID_PRESETS.includes(parsed.preset as SearchPreset)
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
  const latestStateRef = useRef(DEFAULT_STATE)
  const localEditedRef = useRef(false)

  useEffect(() => {
    latestStateRef.current = state
  }, [state])

  useEffect(() => {
    let active = true

    void (async () => {
      let raw: string | null = null
      let shouldPersistNormalizedState = false

      try {
        raw = await asyncStorageAdapter.getItem(STORAGE_KEY)
        if (!active) return

        const parsed = parseState(raw)
        const serializedParsed = serializeState(parsed)
        shouldPersistNormalizedState = raw !== serializedParsed

        if (!localEditedRef.current) {
          latestStateRef.current = parsed
          setState(parsed)
        }
      } catch (error) {
        console.warn('Failed to load mobile search mode from storage', error)
      } finally {
        const shouldPersistLocalEdit = localEditedRef.current
        const shouldPersistNormalized = active && !localEditedRef.current && shouldPersistNormalizedState

        if (active) {
          hasLoadedRef.current = true
        }

        if (shouldPersistLocalEdit || shouldPersistNormalized) {
          void asyncStorageAdapter.setItem(STORAGE_KEY, serializeState(latestStateRef.current))
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const persistState = useCallback((next: MobileSearchModeState) => {
    if (!hasLoadedRef.current) return
    void asyncStorageAdapter.setItem(STORAGE_KEY, serializeState(next))
  }, [])

  const updateState = useCallback((updater: (prev: MobileSearchModeState) => MobileSearchModeState) => {
    setState((prev) => {
      localEditedRef.current = true
      const next = updater(prev)
      latestStateRef.current = next
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
