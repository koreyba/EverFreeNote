export type RegisterViewScrollSurface = (
  tabId: string,
  noteId: string | null,
  node: HTMLElement,
  cancelPending: () => void,
) => () => void
