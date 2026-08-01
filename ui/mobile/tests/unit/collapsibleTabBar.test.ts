import {
  initialCollapsibleTabBarState,
  reduceCollapsibleTabBarState,
} from '@ui/mobile/utils/collapsibleTabBar'

describe('collapsible tab bar state', () => {
  it('starts visible', () => {
    expect(initialCollapsibleTabBarState).toEqual({
      visible: true,
      lastOffset: 0,
      accumulatedDelta: 0,
    })
  })

  it('hides only after accumulated downward scrolling crosses the threshold', () => {
    const afterSmallScroll = reduceCollapsibleTabBarState(initialCollapsibleTabBarState, 10)
    expect(afterSmallScroll.visible).toBe(true)

    const afterThreshold = reduceCollapsibleTabBarState(afterSmallScroll, 16)
    expect(afterThreshold.visible).toBe(false)
  })

  it('shows after accumulated upward scrolling and resets at the top', () => {
    const hidden = reduceCollapsibleTabBarState(initialCollapsibleTabBarState, 20)
    const stillHidden = reduceCollapsibleTabBarState(hidden, 10)
    expect(stillHidden.visible).toBe(false)

    const shown = reduceCollapsibleTabBarState(stillHidden, 0)
    expect(shown).toEqual(initialCollapsibleTabBarState)
  })

  it('shows after an upward threshold before reaching the top', () => {
    const hidden = reduceCollapsibleTabBarState(initialCollapsibleTabBarState, 20)
    const shown = reduceCollapsibleTabBarState(hidden, 4)

    expect(shown).toEqual({ visible: true, lastOffset: 4, accumulatedDelta: 0 })
  })

  it('restarts accumulation when scroll direction changes', () => {
    const partialDown = reduceCollapsibleTabBarState(initialCollapsibleTabBarState, 12)
    const directionChanged = reduceCollapsibleTabBarState(partialDown, 8)

    expect(directionChanged.visible).toBe(true)
    expect(directionChanged.accumulatedDelta).toBe(-4)
  })
})
