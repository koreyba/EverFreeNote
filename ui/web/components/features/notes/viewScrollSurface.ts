export type RegisterViewScrollSurface = (
  tabId: string,
  noteId: string | null,
  node: HTMLElement,
  cancelPending: () => void,
) => () => void

/** Restore immediately, with one retry if the browser clamped the offset. */
export function restoreViewScroll(node: HTMLElement, scrollTop: number, onInteraction?: () => void): (() => void) | undefined {
  node.scrollTop = scrollTop
  const applied = node.scrollTop
  if (applied === scrollTop) return
  const view = node.ownerDocument.defaultView
  if (!view) return
  let interacted = false
  const markInteraction = () => { interacted = true; onInteraction?.() }
  const onScroll = () => { if (node.scrollTop !== applied) markInteraction() }
  const keyScope = node.closest('[data-testid^="split-pane-"], [data-active-pane="true"]') ?? node
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof view.Node && keyScope.contains(event.target)
      && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) markInteraction()
  }
  node.addEventListener('scroll', onScroll, { passive: true })
  node.addEventListener('wheel', markInteraction, { passive: true })
  node.addEventListener('touchstart', markInteraction, { passive: true })
  node.addEventListener('pointerdown', markInteraction, { passive: true })
  node.ownerDocument.addEventListener('keydown', onKeyDown)
  const removeListeners = () => {
    node.removeEventListener('scroll', onScroll)
    node.removeEventListener('wheel', markInteraction)
    node.removeEventListener('touchstart', markInteraction)
    node.removeEventListener('pointerdown', markInteraction)
    node.ownerDocument.removeEventListener('keydown', onKeyDown)
  }
  const frame = view.requestAnimationFrame(() => {
    removeListeners()
    // Do not overwrite a newer scroll while content was settling, even if the
    // user returned to the original position before this frame was delivered.
    if (!interacted && node.isConnected && node.scrollTop === applied) node.scrollTop = scrollTop
  })
  return () => { view.cancelAnimationFrame(frame); removeListeners() }
}
