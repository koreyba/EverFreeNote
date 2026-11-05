import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { TrashPage } from '@ui/web/components/features/notes/TrashPage'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'

jest.mock('@core/services/notes')
// JSDOM has no viewport measurements. Keep the real cards and render their
// virtual rows eagerly; browser tests exercise the actual scrolling layout.
jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { height: number; width: number }) => ReactNode }) =>
    children({ height: 500, width: 320 }),
}))
jest.mock('react-window', () => ({
  List: ({ rowCount, rowComponent: Row, rowProps }: {
    rowCount: number
    rowComponent: ComponentType<Record<string, unknown>>
    rowProps: Record<string, unknown>
  }) => Array.from({ length: rowCount }, (_, index) => (
    <Row key={index} index={index} style={{}} ariaAttributes={{ role: 'listitem' }} {...rowProps} />
  )),
  useDynamicRowHeight: () => 140,
}))
const entry = {
  trash_id: 'entry',
  original_note_id: 'note',
  user_id: 'owner',
  title: 'Deleted note',
  tags: ['work'],
  deleted_at: '2026-11-01T00:00:00Z',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  body_bytes: 20,
  preview_html: '<p>Card excerpt</p>',
}
const list = jest.fn(),
  preview = jest.fn(),
  restore = jest.fn(),
  purge = jest.fn(),
  allIds = jest.fn()

function show(isOffline = false, pending: unknown[] = []) {
  const changed = jest.fn()
  render(
    <SupabaseTestProvider
      supabase={{} as never}
      user={{ id: 'owner' } as never}
    >
      <TrashPage
        isOffline={isOffline}
        loadPending={async () => pending as never}
        onChanged={changed}
      />
    </SupabaseTestProvider>,
  )
  return { changed }
}

beforeEach(() => {
  localStorage.clear()
  list.mockResolvedValue({ notes: [entry], totalCount: 1, hasMore: false })
  preview.mockResolvedValue({ ...entry, description: '<p>Saved body</p>' })
  restore.mockResolvedValue([
    { trash_id: 'entry', id: 'note', status: 'restored' },
  ])
  purge.mockResolvedValue([{ trash_id: 'entry', status: 'purged' }])
  allIds.mockResolvedValue(['entry', 'second'])
  jest.mocked(NoteService).mockImplementation(
    () =>
      ({
        getTrash: list,
        getTrashedNote: preview,
        restoreTrashedNotes: restore,
        purgeTrashedNotes: purge,
        getAllTrashIds: allIds,
      }) as never,
  )
})

describe('Trash page', () => {
  it('loads a read-only preview only when the user opens a note', async () => {
    show()
    expect(await screen.findByText('Card excerpt')).toBeTruthy()
    expect(preview).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Deleted note' }))
    expect(await screen.findByText('Saved body')).toBeTruthy()
    expect(preview).toHaveBeenCalledWith('entry', 'owner')
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('restores an explicit entry and refreshes active data', async () => {
    const { changed } = show()
    fireEvent.click(await screen.findByRole('button', { name: 'Deleted note' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Restore note' }),
    )
    await waitFor(() => expect(restore).toHaveBeenCalledWith(['entry']))
    await waitFor(() => expect(changed).toHaveBeenCalled())
  })

  it('requires confirmation before permanently deleting a single note', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Deleted note' }))
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Delete note forever',
      }),
    )
    expect(purge).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(purge).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete note forever' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    await waitFor(() => expect(purge).toHaveBeenCalledWith(['entry']))
  })

  it('freezes Empty Trash entry IDs and requires their exact count', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Empty Trash' }))
    await screen.findByTestId('bulk-delete-confirm-input')
    expect(allIds).toHaveBeenCalledWith('owner')
    allIds.mockResolvedValue(['entry', 'second', 'new-arrival'])
    fireEvent.change(screen.getByTestId('bulk-delete-confirm-input'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    await waitFor(() => expect(purge).toHaveBeenCalledWith(['entry', 'second']))
  })

  it('shows an owned offline snapshot while permanent actions are unavailable', async () => {
    show(true, [
      {
        id: 'q',
        noteId: 'local',
        operation: 'delete',
        payload: {
          user_id: 'owner',
          title: 'Offline draft',
          description: 'Local body',
          tags: [],
        },
        status: 'pending',
        clientUpdatedAt: '2026-11-01',
      },
    ])
    fireEvent.click(await screen.findByRole('button', { name: 'Offline draft' }))
    expect(await screen.findByText(/Pending sync/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Restore note' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete note forever' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Empty Trash' })).toBeNull()
    expect(list).not.toHaveBeenCalled()
  })

  it('discards expired previews from both the open pane and the reading cache', async () => {
    const loadPending = async () => []
    const tree = (refreshToken: number) => (
      <SupabaseTestProvider
        supabase={{} as never}
        user={{ id: 'owner' } as never}
      >
        <TrashPage
          isOffline={false}
          loadPending={loadPending}
          onChanged={() => {}}
          refreshToken={refreshToken}
        />
      </SupabaseTestProvider>
    )
    const view = render(tree(0))
    fireEvent.click(await screen.findByRole('button', { name: 'Deleted note' }))
    await screen.findByText('Saved body')
    let finish!: (value: unknown) => void
    preview.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Deleted note' }))
    list.mockResolvedValue({ notes: [], totalCount: 0, hasMore: false })
    view.rerender(tree(1))
    await screen.findByText('Trash is empty.')
    await act(async () => {
      finish({ ...entry, description: 'Late expired body' })
    })
    expect(screen.queryByText('Saved body')).toBeNull()
    expect(screen.queryByText('Late expired body')).toBeNull()
    expect(
      JSON.parse(localStorage.getItem('everfreenote:trash:owner')!).previews,
    ).toEqual({})
  })

  it('ignores a slow preview after the user opens a different note', async () => {
    const second = { ...entry, trash_id: 'second', title: 'Second note' }
    list.mockResolvedValue({
      notes: [entry, second],
      totalCount: 2,
      hasMore: false,
    })
    let finish!: (value: unknown) => void
    preview
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValueOnce({ ...second, description: 'Second body' })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Deleted note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Second note' }))
    await screen.findByText('Second body')
    await act(async () => {
      finish({ ...entry, description: 'Outdated body' })
    })
    expect(screen.queryByText('Outdated body')).toBeNull()
    expect(screen.getByText('Second body')).toBeTruthy()
  })

  it('never merges an unverified legacy draft into an owned pending deletion', async () => {
    show(true, [
      {
        id: 'legacy',
        noteId: 'legacy-note',
        operation: 'create',
        payload: {
          title: 'Foreign legacy draft',
          description: 'Private legacy body',
          tags: [],
        },
        status: 'pending',
        clientUpdatedAt: '2026-01-01',
      },
      {
        id: 'legacy-delete',
        noteId: 'legacy-note',
        operation: 'delete',
        payload: { user_id: 'owner' },
        status: 'pending',
        clientUpdatedAt: '2026-01-02',
      },
      {
        id: 'own-delete',
        noteId: 'own-note',
        operation: 'delete',
        payload: {
          user_id: 'owner',
          title: 'Owned draft',
          description: 'Owned body',
          tags: [],
        },
        status: 'pending',
        clientUpdatedAt: '2026-01-03',
      },
    ])
    await screen.findByText('Owned draft')
    expect(screen.queryByText('Foreign legacy draft')).toBeNull()
  })

  it('keeps failed Empty Trash entries visibly selected for a retry', async () => {
    allIds.mockResolvedValue(['entry'])
    purge.mockRejectedValue(new Error('Connection lost'))
    show()
    await screen.findByRole('button',{name:'Deleted note'})
    fireEvent.click(await screen.findByRole('button', { name: 'Empty Trash' }))
    fireEvent.change(await screen.findByTestId('bulk-delete-confirm-input'), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    await screen.findByText(/1 notes could not be deleted/)
    expect(
      screen
        .getByRole('checkbox', { name: 'Select note "Deleted note"' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(screen.getByText('1 selected')).toBeTruthy()
  })
})
