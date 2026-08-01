export const TAB_BAR_SCROLL_THRESHOLD = 16

export type CollapsibleTabBarState = {
  visible: boolean
  lastOffset: number
  accumulatedDelta: number
}
export const initialCollapsibleTabBarState: CollapsibleTabBarState = {
  visible: true,
  lastOffset: 0,
  accumulatedDelta: 0,
}

export function reduceCollapsibleTabBarState(
  state: CollapsibleTabBarState,
  offsetY: number,
  threshold = TAB_BAR_SCROLL_THRESHOLD
): CollapsibleTabBarState {
  const offset = Math.max(0, offsetY)

  if (offset <= 0) {
    return {
      visible: true,
      lastOffset: 0,
      accumulatedDelta: 0,
    }
  }

  const delta = offset - state.lastOffset
  if (delta === 0) return state

  const accumulatedDelta = Math.sign(delta) === Math.sign(state.accumulatedDelta)
    ? state.accumulatedDelta + delta
    : delta

  if (accumulatedDelta >= threshold) {
    return { visible: false, lastOffset: offset, accumulatedDelta: 0 }
  }

  if (accumulatedDelta <= -threshold) {
    return { visible: true, lastOffset: offset, accumulatedDelta: 0 }
  }

  return { ...state, lastOffset: offset, accumulatedDelta }
}
