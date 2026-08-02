import React from 'react'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '../../../../core/types/domain'
import type { NoteEditorHandle } from '../../../../ui/web/components/features/notes/NoteEditor'

export type FakeController = Record<string, unknown>

export const pastePlainText = (text: string) => {
  cy.get('[data-cy="editor-content"]').click()
  cy.get('.ProseMirror').trigger('paste', {
    clipboardData: {
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })
}

export const makeWorkspaceTab = (note: NoteViewModel | null, isEditing: boolean): NoteWorkspaceTab => ({
  id: 'tab-1',
  noteId: note?.id ?? null,
  note,
  mode: isEditing ? 'editing' : 'reading',
  draft: {
    title: note?.title ?? '',
    description: note?.description ?? '',
    tags: note?.tags.join(', ') ?? '',
  },
  view: { scrollTop: 0 },
  saveState: 'saved',
  saveError: null,
})

export function useEditorExitState(isEditing: boolean) {
  const registeredEditorRef = React.useRef<React.RefObject<NoteEditorHandle | null> | null>(null)

  const registerNoteEditorRef = React.useCallback((ref: React.RefObject<NoteEditorHandle | null>) => {
    registeredEditorRef.current = ref
  }, [])

  const flushIfEditing = React.useCallback(async () => {
    if (!isEditing) return
    await registeredEditorRef.current?.current?.flushPendingSave()
  }, [isEditing])

  return { registerNoteEditorRef, flushIfEditing }
}
