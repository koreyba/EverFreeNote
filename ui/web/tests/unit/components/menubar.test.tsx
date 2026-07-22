import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'

function Demo({ onSelect = jest.fn() }: { onSelect?: jest.Mock }) {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel inset>Actions</MenubarLabel>
          <MenubarItem inset onSelect={() => onSelect('new')}>New <MenubarShortcut>Ctrl+N</MenubarShortcut></MenubarItem>
          <MenubarItem disabled onSelect={() => onSelect('disabled')}>Disabled</MenubarItem>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarCheckboxItem checked onCheckedChange={(checked) => onSelect(`checked:${checked}`)}>Pinned</MenubarCheckboxItem>
          </MenubarGroup>
          <MenubarRadioGroup value="compact" onValueChange={(value) => onSelect(`density:${value}`)}>
            <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
            <MenubarRadioItem value="comfortable">Comfortable</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSub>
            <MenubarSubTrigger inset>More</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={() => onSelect('nested')}>Nested action</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

describe('menubar wrappers', () => {
  it('opens with click and keyboard, renders item decorations, and selects an item', async () => {
    const onSelect = jest.fn()
    render(<Demo onSelect={onSelect} />)
    const trigger = screen.getByRole('menuitem', { name: 'File' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const content = await screen.findByRole('menu')
    expect(screen.getByText('Actions').classList.contains('pl-8')).toBe(true)
    expect(screen.getByText('Ctrl+N').classList.contains('ml-auto')).toBe(true)
    expect(screen.getByRole('menuitem', { name: 'Disabled' }).getAttribute('data-disabled')).not.toBeNull()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }).getAttribute('data-state')).toBe('checked')
    expect(screen.getByRole('menuitemradio', { name: 'Compact' }).getAttribute('data-state')).toBe('checked')
    expect(content.contains(screen.getByText('More'))).toBe(true)

    fireEvent.click(screen.getByRole('menuitem', { name: /^New/ }))
    expect(onSelect).toHaveBeenCalledWith('new')

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('supports checkbox, radio, and nested submenu interactions', async () => {
    const onSelect = jest.fn()
    render(<Demo onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'File' }), { key: 'ArrowDown' })
    await screen.findByRole('menu')

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }))
    expect(onSelect).toHaveBeenCalledWith('checked:false')

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'File' }), { key: 'ArrowDown' })
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Comfortable' }))
    expect(onSelect).toHaveBeenCalledWith('density:comfortable')

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'File' }), { key: 'ArrowDown' })
    await screen.findByRole('menu')
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'More' }), { key: 'ArrowRight' })
    expect(await screen.findByRole('menuitem', { name: 'Nested action' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nested action' }))
    expect(onSelect).toHaveBeenCalledWith('nested')
  })
})
