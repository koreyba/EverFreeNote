import { fireEvent, render, screen } from '@testing-library/react'
import { NavRail } from '@ui/web/components/features/navigation/NavRail'
import { BulkDeleteDialog } from '@ui/web/components/features/notes/BulkDeleteDialog'

describe('Trash navigation and irreversible confirmation', () => {
  it('opens Trash from the existing navigation', () => {
    const select = jest.fn()
    render(
      <NavRail
        activeView="notes"
        onSelectView={select}
        onOpenSearch={jest.fn()}
        onOpenSettings={jest.fn()}
      />,
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Trash' })[0])
    expect(select).toHaveBeenCalledWith('trash')
  })

  it('requires the selected count before permanently deleting Trash contents', () => {
    const confirm = jest.fn()
    render(
      <BulkDeleteDialog
        open
        onOpenChange={jest.fn()}
        count={3}
        onConfirm={confirm}
        action="purge"
      />,
    )
    expect(screen.getByText(/permanently delete 3 notes/i)).toBeTruthy()
    const button = screen.getByRole('button', {
      name: 'Delete forever',
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('bulk-delete-confirm-input'), {
      target: { value: '3' },
    })
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledTimes(1)
  })
})
