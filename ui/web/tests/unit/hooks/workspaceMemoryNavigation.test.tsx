import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useNoteWorkspaceTabs } from '@ui/web/hooks/useNoteWorkspaceTabs'
import { WorkspaceMemoryProvider } from '@ui/web/providers/WorkspaceMemoryProvider'

jest.mock('sonner', () => ({ toast: { warning: jest.fn() } }))

function Workspace({ userId }: { userId: string }) {
  const workspace = useNoteWorkspaceTabs(userId)
  return <>
    <output data-testid="draft">{workspace.activeTab.draft.title || 'empty'}</output>
    <output data-testid="state">{workspace.activeTab.saveState}</output>
    <button onClick={() => workspace.updateTab(workspace.activeTabId, {
      mode: 'editing', draft: { title: 'private A draft' }, saveState: 'error', saveError: 'Quota exceeded',
    })}>Fail save</button>
    <button onClick={() => workspace.updateTab(workspace.activeTabId, {
      draft: { title: 'saved A draft' }, saveState: 'saved', saveError: null,
    })}>Save draft</button>
  </>
}

describe('workspace memory across same-document navigation', () => {
  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'QuotaExceededError') })
  })

  afterEach(() => { jest.restoreAllMocks() })

  it('isolates failed drafts by account and restores them when the owner returns', async () => {
    const { rerender } = render(<React.StrictMode><WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider></React.StrictMode>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('empty'))
    fireEvent.click(screen.getByRole('button', { name: 'Fail save' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('error'))
    rerender(<React.StrictMode><WorkspaceMemoryProvider><Workspace userId="B" /></WorkspaceMemoryProvider></React.StrictMode>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('empty'))
    rerender(<React.StrictMode><WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider></React.StrictMode>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('private A draft'))
    expect(screen.getByTestId('state').textContent).toBe('error')
  })

  it('clears the volatile failed copy after the owner saves it', async () => {
    const { rerender } = render(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('empty'))
    fireEvent.click(screen.getByRole('button', { name: 'Fail save' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('error'))
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('saved'))
    rerender(<WorkspaceMemoryProvider><Workspace userId="B" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('empty'))
    rerender(<WorkspaceMemoryProvider><Workspace userId="A" /></WorkspaceMemoryProvider>)
    await waitFor(() => expect(screen.getByTestId('draft').textContent).toBe('empty'))
  })
})
