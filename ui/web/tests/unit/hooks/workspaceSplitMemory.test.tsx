import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useNoteWorkspaceTabs } from '@ui/web/hooks/useNoteWorkspaceTabs'
import { WorkspaceMemoryProvider } from '@ui/web/providers/WorkspaceMemoryProvider'
import type { NoteViewModel } from '@core/types/domain'

jest.mock('sonner', () => ({ toast: { warning: jest.fn() } }))

function Workspace({ userId }: { userId: string }) {
  const workspace = useNoteWorkspaceTabs(userId)
  const note = (id: string): NoteViewModel => ({
    id, title: `${userId} ${id}`, description: id, tags: [], user_id: userId,
    created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z',
  })
  return <>
    <output data-testid="owner">{workspace.userId}</output>
    <output data-testid="notes">{workspace.tabs.map(tab => tab.note?.title).filter(Boolean).join(', ')}</output>
    <output data-testid="split">{workspace.split ? 'split' : 'single'}</output>
    <button onClick={() => {
      workspace.openNote(note('one'))
      const rightTabId = workspace.addTab()
      workspace.openNote(note('two'))
      workspace.setSplit({ leftTabId: workspace.activeTabId, rightTabId, focusedTabId: rightTabId })
    }}>Open split</button>
    <button onClick={() => workspace.setSplit(null)}>Close split</button>
  </>
}

describe('split workspace across same-document navigation', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => jest.restoreAllMocks())

  it('retains split when storage is blocked and keeps accounts isolated A → B → A', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'QuotaExceededError') })
    const { rerender } = render(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('owner').textContent).toBe('A'))
    fireEvent.click(screen.getByText('Open split'))
    await waitFor(() => expect(screen.getByTestId('split').textContent).toBe('split'))
    expect(screen.getByTestId('notes').textContent).toBe('A one, A two')

    rerender(<WorkspaceMemoryProvider><Workspace userId="B" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('owner').textContent).toBe('B'))
    expect(screen.getByTestId('notes').textContent).toBe('')
    expect(screen.getByTestId('split').textContent).toBe('single')
    rerender(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('split').textContent).toBe('split'))
    expect(screen.getByTestId('notes').textContent).toBe('A one, A two')
  })

  it('does not revive an old stored split after closing it while writes fail', async () => {
    const { rerender } = render(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('owner').textContent).toBe('A'))
    fireEvent.click(screen.getByText('Open split'))
    await waitFor(() => expect(screen.getByTestId('split').textContent).toBe('split'))
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError') })
    fireEvent.click(screen.getByText('Close split'))
    await waitFor(() => expect(screen.getByTestId('split').textContent).toBe('single'))
    rerender(<WorkspaceMemoryProvider><Workspace userId="B" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('owner').textContent).toBe('B'))
    rerender(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('owner').textContent).toBe('A'))
    expect(screen.getByTestId('split').textContent).toBe('single')
    expect(screen.getByTestId('notes').textContent).toBe('A one, A two')
  })
})
