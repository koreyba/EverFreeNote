import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { getTabCapacity, MIN_TAB_WIDTH_PX, NotesTabStrip } from '@/components/features/notes/NotesTabStrip'
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

function mockClientWidth(width: number) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  })

  return () => {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', descriptor)
    } else {
      delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth
    }
  }
}

describe('Notes workspace tab controls', () => {
  let restoreDefaultClientWidth: (() => void) | null = null

  beforeEach(() => {
    restoreDefaultClientWidth = mockClientWidth(800)
  })

  afterEach(() => {
    restoreDefaultClientWidth?.()
    restoreDefaultClientWidth = null
  })

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

    expect(screen.getByRole('button', { name: 'First note' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^Second note/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByLabelText('Unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Second note/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close First note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add note tab' }))

    expect(onActivateTab).toHaveBeenCalledWith('tab-2')
    expect(onCloseTab).toHaveBeenCalledWith('tab-1')
    expect(onAddTab).toHaveBeenCalledTimes(1)
  })

  it('keeps Add tab first and usable when more tabs are open than fit on screen', () => {
    const restoreClientWidth = mockClientWidth(MIN_TAB_WIDTH_PX * 2 + 4)

    try {
      const manyTabs = [
        makeTab('tab-1', 'First note'),
        makeTab('tab-2', 'Second note'),
        makeTab('tab-3', 'Third note'),
      ]
      const onAddTab = jest.fn()
      render(
        <NotesTabStrip
          tabs={manyTabs}
          activeTabId="tab-1"
          onAddTab={onAddTab}
          onActivateTab={jest.fn()}
          onCloseTab={jest.fn()}
        />,
      )

      // Running out of horizontal room scrolls the strip; it must never stop
      // the user from opening another note.
      const addButton = screen.getByRole('button', { name: 'Add note tab' })
      expect(addButton.hasAttribute('disabled')).toBe(false)
      expect(addButton.parentElement?.firstElementChild).toBe(addButton)
      fireEvent.click(addButton)
      expect(onAddTab).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText('Open notes').className).toContain('overflow-x-auto')
    } finally {
      restoreClientWidth()
    }
  })

  it('disables Add only at the shared workspace tab maximum', () => {
    const manyTabs = Array.from({ length: 32 }, (_, index) => makeTab(`tab-${index}`, `Note ${index}`))

    render(
      <NotesTabStrip
        tabs={manyTabs}
        activeTabId="tab-0"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
        maximumTabCount={32}
      />,
    )

    const addButton = screen.getByRole('button', { name: 'Add note tab (limit reached: 32 tabs)' })
    expect(addButton.hasAttribute('disabled')).toBe(true)
  })

  it('offers scroll controls once the strip overflows and moves the viewport', () => {
    const restoreClientWidth = mockClientWidth(MIN_TAB_WIDTH_PX)
    const scrollBy = jest.fn()
    const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => MIN_TAB_WIDTH_PX * 6,
    })
    HTMLElement.prototype.scrollBy = scrollBy

    try {
      render(
        <NotesTabStrip
          tabs={Array.from({ length: 6 }, (_, index) => makeTab(`tab-${index}`, `Note ${index}`))}
          activeTabId="tab-0"
          onAddTab={jest.fn()}
          onActivateTab={jest.fn()}
          onCloseTab={jest.fn()}
        />,
      )

      const scrollRight = screen.getByRole('button', { name: 'Scroll tabs right' })
      expect(scrollRight.hasAttribute('disabled')).toBe(false)
      // At scrollLeft 0 there is nothing to the left yet.
      expect(screen.getByRole('button', { name: 'Scroll tabs left' }).hasAttribute('disabled')).toBe(true)

      fireEvent.click(scrollRight)
      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0)
    } finally {
      delete (HTMLElement.prototype as unknown as { scrollBy?: unknown }).scrollBy
      if (scrollWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor)
      } else {
        delete (HTMLElement.prototype as unknown as { scrollWidth?: number }).scrollWidth
      }
      restoreClientWidth()
    }
  })

  it('calculates capacity from the tab minimum instead of allowing zero-width tabs', () => {
    expect(getTabCapacity(MIN_TAB_WIDTH_PX - 1)).toBe(1)
    expect(getTabCapacity(MIN_TAB_WIDTH_PX * 2 + 4)).toBe(2)
    expect(getTabCapacity(0)).toBe(1)
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

    fireEvent.keyDown(screen.getByRole('button', { name: 'First note' }), { key: 'ArrowRight' })
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

    fireEvent.keyDown(screen.getByRole('button', { name: 'First note' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('button', { name: /^Second note/ }), { key: 'Home' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'First note' }), { key: 'End' })

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
    expect(screen.getByRole('button', { name: 'Open note tabs (2)' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps the mobile tab list scrollable and exposes a disabled Add state at the shared limit', () => {
    const manyTabs = Array.from({ length: 40 }, (_, index) => makeTab(`tab-${index}`, `Note ${index}`))
    const onAddTab = jest.fn()

    render(
      <MobileNotesTabMenu
        tabs={manyTabs}
        activeTabId="tab-0"
        onAddTab={onAddTab}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
        addTabDisabled
        maximumTabCount={32}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (40)' }))
    const addButton = screen.getByRole('button', { name: 'Add tab (limit reached: 32 tabs)' })
    expect(addButton.hasAttribute('disabled')).toBe(true)
    expect(onAddTab).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Open notes').firstElementChild?.className).toContain('overflow-y-auto')
  })

  it('announces capacity checking instead of claiming the limit during hydration', () => {
    render(
      <MobileNotesTabMenu
        tabs={[makeTab('tab-1', 'First note')]}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
        addTabCapacityPending
        maximumTabCount={32}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (1)' }))
    const addButton = screen.getByRole('button', { name: 'Add tab (checking workspace capacity)' })
    expect(addButton.hasAttribute('disabled')).toBe(true)
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

  it('floats the mobile tab list over the note instead of pushing it down', () => {
    render(
      <MobileNotesTabMenu
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (2)' }))
    const panel = document.getElementById('mobile-notes-tab-list')

    expect(panel?.className).toContain('absolute')
    expect(panel?.className).toContain('top-full')
  })

  it('dismisses the mobile tab list on outside pointer down and on Escape', () => {
    render(
      <MobileNotesTabMenu
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
      />,
    )

    const menuButton = screen.getByRole('button', { name: 'Open note tabs (2)' })

    fireEvent.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    fireEvent.pointerDown(document.body)
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(menuButton)
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('brings the active row into view when the mobile tab list opens', () => {
    const scrollIntoView = jest.fn()
    const original = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    try {
      render(
        <MobileNotesTabMenu
          tabs={Array.from({ length: 30 }, (_, index) => makeTab(`tab-${index}`, `Note ${index}`))}
          activeTabId="tab-27"
          onAddTab={jest.fn()}
          onActivateTab={jest.fn()}
          onCloseTab={jest.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Open note tabs (30)' }))
      expect(scrollIntoView).toHaveBeenCalled()
    } finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  })

  it('keeps a pointer down inside the mobile tab list from closing it', () => {
    render(
      <MobileNotesTabMenu
        tabs={tabs}
        activeTabId="tab-1"
        onAddTab={jest.fn()}
        onActivateTab={jest.fn()}
        onCloseTab={jest.fn()}
      />,
    )

    const menuButton = screen.getByRole('button', { name: 'Open note tabs (2)' })
    fireEvent.click(menuButton)
    fireEvent.pointerDown(document.getElementById('mobile-notes-tab-list')!)

    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
  })
})
