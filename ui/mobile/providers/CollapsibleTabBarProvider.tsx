import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import {
  initialCollapsibleTabBarState,
  reduceCollapsibleTabBarState,
} from '@ui/mobile/utils/collapsibleTabBar'

type CollapsibleTabBarContextValue = {
  isVisible: boolean
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  reset: () => void
}
const CollapsibleTabBarContext = createContext<CollapsibleTabBarContextValue | undefined>(undefined)

export function CollapsibleTabBarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialCollapsibleTabBarState)

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y
    setState((current) => reduceCollapsibleTabBarState(current, offsetY))
  }, [])

  const reset = useCallback(() => {
    setState(initialCollapsibleTabBarState)
  }, [])

  const value = useMemo(() => ({
    isVisible: state.visible,
    onScroll,
    reset,
  }), [onScroll, reset, state.visible])

  return (
    <CollapsibleTabBarContext.Provider value={value}>
      {children}
    </CollapsibleTabBarContext.Provider>
  )
}

export function useCollapsibleTabBar() {
  const context = useContext(CollapsibleTabBarContext)
  if (!context) throw new Error('useCollapsibleTabBar must be used within CollapsibleTabBarProvider')
  return context
}
