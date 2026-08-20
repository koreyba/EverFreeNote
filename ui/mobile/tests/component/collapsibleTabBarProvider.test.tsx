import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import {
  CollapsibleTabBarProvider,
  useCollapsibleTabBar,
} from '@ui/mobile/providers/CollapsibleTabBarProvider'

const scrollEvent = (offsetY: number) => ({
  nativeEvent: { contentOffset: { y: offsetY } },
}) as unknown as NativeSyntheticEvent<NativeScrollEvent>

describe('CollapsibleTabBarProvider', () => {
  it('updates visibility from scroll events and resets to visible', () => {
    const { result } = renderHook(() => useCollapsibleTabBar(), {
      wrapper: ({ children }) => (
        <CollapsibleTabBarProvider>{children}</CollapsibleTabBarProvider>
      ),
    })

    act(() => result.current.onScroll(scrollEvent(20)))
    expect(result.current.isVisible).toBe(false)

    act(() => result.current.reset())
    expect(result.current.isVisible).toBe(true)
  })

  it('rejects consumers outside the provider', () => {
    expect(() => renderHook(() => useCollapsibleTabBar())).toThrow(
      'useCollapsibleTabBar must be used within CollapsibleTabBarProvider'
    )
  })
})
