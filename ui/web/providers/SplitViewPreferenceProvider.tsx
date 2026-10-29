'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export const SPLIT_VIEW_ENABLED_KEY = 'split_view_enabled'

type Preference = {
  enabled: boolean
  ready: boolean
  persisted: boolean
  setEnabled: (enabled: boolean) => void
  isEnabled: () => boolean
}

const DEFAULT_PREFERENCE: Preference = {
  enabled: false,
  ready: false,
  persisted: true,
  setEnabled: () => {},
  isEnabled: () => false,
}

const SplitViewPreferenceContext = createContext<Preference>(DEFAULT_PREFERENCE)

/** Browser-level preference; mounted above account and route boundaries. */
export function SplitViewPreferenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ enabled: false, ready: false, persisted: true })
  const enabledRef = useRef(false)
  const readableRef = useRef(false)

  useEffect(() => {
    try {
      const enabled = window.localStorage.getItem(SPLIT_VIEW_ENABLED_KEY) === 'true'
      readableRef.current = true
      enabledRef.current = enabled
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the browser-only preference after SSR
      setState({ enabled, ready: true, persisted: true })
    } catch {
      setState({ enabled: false, ready: true, persisted: false })
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SPLIT_VIEW_ENABLED_KEY && event.key !== null) return
      try {
        if (event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      const enabled = event.newValue === 'true'
      enabledRef.current = enabled
      setState({ enabled, ready: true, persisted: readableRef.current })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled
    let persisted = false
    try {
      window.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, String(enabled))
      persisted = window.localStorage.getItem(SPLIT_VIEW_ENABLED_KEY) === String(enabled)
      readableRef.current = true
    } catch {
      persisted = false
    }
    setState({ enabled, ready: true, persisted })
  }, [])
  const isEnabled = useCallback(() => enabledRef.current, [])
  const value = useMemo(() => ({ ...state, setEnabled, isEnabled }), [isEnabled, setEnabled, state])
  return <SplitViewPreferenceContext.Provider value={value}>{children}</SplitViewPreferenceContext.Provider>
}

export function useSplitViewPreference() {
  return useContext(SplitViewPreferenceContext)
}
