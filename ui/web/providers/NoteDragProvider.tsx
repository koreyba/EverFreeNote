"use client"

import { createContext, useContext, useMemo, type DragEvent, type ReactNode } from 'react'
import { NOTE_DRAG_TYPE } from '@ui/web/lib/noteDrag'

const NoteDragContext = createContext({ ownerId: null as string | null, enabled: false })

export function NoteDragProvider({ ownerId, enabled, children }: { ownerId: string | null; enabled: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ ownerId, enabled }), [ownerId, enabled])
  return <NoteDragContext.Provider value={value}>{children}</NoteDragContext.Provider>
}

export function useNoteDragSource() {
  const { ownerId, enabled } = useContext(NoteDragContext)
  return {
    enabled: enabled && Boolean(ownerId),
    start: (event: DragEvent<HTMLElement>, source: { noteId?: string; tabId?: string }) => {
      if (!enabled || !ownerId) { event.preventDefault(); return }
      event.dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify({ version: 1, ownerId, ...source }))
      event.dataTransfer.effectAllowed = source.tabId ? 'move' : 'copy'
    },
  }
}
