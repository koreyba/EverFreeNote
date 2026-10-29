export type RegisterViewScrollSurface = (
  tabId: string,
  noteId: string | null,
  node: HTMLElement,
  cancelPending: () => void,
) => () => void

/** Restore immediately, with one retry if the browser clamped the offset. */
export function restoreViewScroll(node: HTMLElement, scrollTop: number): (() => void) | undefined {
  node.scrollTop = scrollTop
  const applied = node.scrollTop
  if (applied === scrollTop) return
  const view = node.ownerDocument.defaultView
  if (!view) return
  const frame = view.requestAnimationFrame(() => {
    // Do not overwrite a newer scroll while content was settling.
    if (node.isConnected && node.scrollTop === applied) node.scrollTop = scrollTop
  })
  return () => view.cancelAnimationFrame(frame)
}
