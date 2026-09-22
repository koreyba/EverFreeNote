import { useEffect } from 'react'

type BackHandler = () => boolean | Promise<boolean>
export const APP_BACK_PRIORITY = { navigation: 10, editor: 20, menu: 30 } as const
const handlers = new Set<{ priority: number; handle: BackHandler }>()

/** Screens own their navigation; the native shell only requests one Back action. */
export function useAppBackHandler(priority: number, handle: BackHandler) {
  useEffect(() => {
    const entry = { priority, handle }
    handlers.add(entry)
    return () => { handlers.delete(entry) }
  }, [priority, handle])
}

export async function dispatchAppBack(): Promise<boolean> {
  if (document.querySelector('[data-native-back-layer][data-state="open"]')) {
    // Radix already owns the top-layer Escape behavior, including nested menus.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    return true
  }
  for (const entry of [...handlers].sort((a, b) => b.priority - a.priority)) {
    if (await entry.handle()) return true
  }
  return false
}
