import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NotesTabStrip } from '@/components/features/notes/NotesTabStrip'
import { MobileNotesTabMenu } from '@/components/features/notes/MobileNotesTabMenu'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'

const makeTab = (id: string, title: string, overrides: Partial<NoteWorkspaceTab> = {}): NoteWorkspaceTab => ({
  id,
  noteId: id,
  note: {
    id,
    title,
    description: '',
    tags: [],
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    user_id: 'user-1',
  },
  mode: 'reading',
  draft: { title, description: '', tags: '' },
  view: { scrollTop: 0 },
  saveState: 'saved',
  saveError: null,
  ...overrides,
})

const tabs = [
  makeTab('tab-1', 'First note'),
  makeTab('tab-2', 'Second note', { saveState: 'dirty' }),
]

describe('Notes workspace tab controls', () => {
  it('renders desktop tabs, save indicators, add, activation, and close actions', () => {
    const onAddTab = jest.fn()
    const onActivateTab = jest.fn()
    const onCloseTab = jest.fn()

    render(
      <NotesTabStrip
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={onAddTab}
        onActivateTab={onActivateTab}
        onCloseTab={onCloseTab}
      />,
    )

    expect(screen.getByRole('tab', { name: 'First note' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /Second note/ }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByLabelText('Unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /Second note/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close First note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note tab' }))

    expect(onActivateTab).toHaveBeenCalledWith('tab-2')
    expect(onCloseTab).toHaveBeenCalledWith('tab-1')
    expect(onAddTab).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard tab navigation', () => {
    const onActivateTab = jest.fn()

    render(
      <NotesTabStrip
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={onActivateTab}
        onCloseTab={jest.fn()}
      />,
    )

    fireEvent.keyDown(screen.getByRole('tab', { name: 'First note' }), { key: 'ArrowRight' })
    expect(onActivateTab).toHaveBeenCalledWith('tab-2')
  })

  it('supports reverse, first, and last keyboard navigation', () => {
    const onActivateTab = jest.fn()

    render(
      <NotesTabStrip
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={onActivateTab}
        onCloseTab={jest.fn()}
      />,
    )

    fireEvent.keyDown(screen.getByRole('tab', { name: 'First note' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('tab', { name: /Second note/ }), { key: 'Home' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'First note' }), { key: 'End' })

    expect(onActivateTab.mock.calls).toEqual([['tab-2'], ['tab-1'], ['tab-2']])
  })

  it('shows saving and error indicators for the active workspace tab', () => {
    render(
      <NotesTabStrip
        tabs={[
          makeTab('tab-saving', 'Saving note', { saveState: 'saving' }),
          makeTab('tab-error', 'Failed note', { saveState: 'error', saveError: 'Network unavailable' }),
        ]}
        activeTabId="tab-saving"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
      />,
    )

    expect(screen.getByLabelText('Saving changes')).toBeTruthy()
    expect(screen.getByLabelText('Network unavailable')).toBeTruthy()
  })

  it('opens the compact mobile list and forwards activation, close, and add actions', () => {
    const onAddTab = jest.fn()
    const onActivateTab = jest.fn()
    const onCloseTab = jest.fn()

    render(
      <MobileNotesTabMenu
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={onAddTab}
        onActivateTab={onActivateTab}
        onCloseTab={onCloseTab}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (2)' }))
    fireEvent.click(screen.getByRole('button', { name: /^Second note/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close First note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add tab' }))

    expect(onActivateTab).toHaveBeenCalledWith('tab-2')
    expect(onCloseTab).toHaveBeenCalledWith('tab-1')
    expect(onAddTab).toHaveBeenCalledTimes(1)
  })

  it('closes the mobile menu after closing its only active tab', () => {
    const onCloseTab = jest.fn()
    render(
      <MobileNotesTabMenu
        tabs={[makeTab('tab-1', 'Only note')]}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={onCloseTab}
      />,
    )

    const menuButton = screen.getByRole('button', { name: 'Open note tabs (1)' })
    fireEvent.click(menuButton)
    fireEvent.click(screen.getByRole('button', { name: 'Close Only note' }))

    expect(onCloseTab).toHaveBeenCalledWith('tab-1')
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('1 tab')).toBeTruthy()
  })
})
