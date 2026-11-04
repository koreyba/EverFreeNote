"use client"

import { createContext, useContext, useMemo, type DragEvent, type ReactNode } from 'react'
import { NOTE_DRAG_TYPE, NOTE_TAB_DRAG_TYPE, readNoteDrag } from '@ui/web/lib/noteDrag'

const NoteDragContext = createContext({ ownerId: null as string | null, enabled: false, tabsEnabled: false })

export function NoteDragProvider({ ownerId, enabled, tabsEnabled = enabled, children }: { ownerId: string | null; enabled: boolean; tabsEnabled?: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ ownerId, enabled, tabsEnabled }), [ownerId, enabled, tabsEnabled])
  return <NoteDragContext.Provider value={value}>{children}</NoteDragContext.Provider>
}

export function useNoteDragSource() {
  const { ownerId, enabled, tabsEnabled } = useContext(NoteDragContext)
  const start = (event: DragEvent<HTMLElement>, source: { noteId?: string; tabId?: string }, allowed: boolean) => {
    if (!allowed || !ownerId) { event.preventDefault(); return }
    event.dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify({ version: 1, ownerId, ...source }))
    if (source.tabId) event.dataTransfer.setData(NOTE_TAB_DRAG_TYPE, '1')
    event.dataTransfer.effectAllowed = source.tabId ? 'move' : 'copy'
  }
  return {
    enabled: enabled && Boolean(ownerId),
    tabsEnabled: tabsEnabled && Boolean(ownerId),
    start: (event: DragEvent<HTMLElement>, source: { noteId?: string; tabId?: string }) => start(event, source, enabled),
    startTab: (event: DragEvent<HTMLElement>, source: { tabId: string; noteId?: string }) => start(event, source, tabsEnabled),
    readPayload: (data: Pick<DataTransfer, 'getData'>) => ownerId ? readNoteDrag(data, ownerId) : null,
  }
}
