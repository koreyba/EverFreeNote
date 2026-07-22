import { fireEvent, render, screen } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function Demo({ onSelect = jest.fn() }: { onSelect?: jest.Mock }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel inset>Actions</DropdownMenuLabel>
        <DropdownMenuItem inset onSelect={() => onSelect('open')}>Open <DropdownMenuShortcut>Enter</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem disabled onSelect={() => onSelect('disabled')}>Disabled</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked onCheckedChange={(checked) => onSelect(`checked:${checked}`)}>Pinned</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="one" onValueChange={(value) => onSelect(`choice:${value}`)}>
          <DropdownMenuRadioItem value="one">One</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="two">Two</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => onSelect('nested')}>Nested action</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('dropdown menu wrappers', () => {
  it('opens the portalled menu, preserves styling props, and selects an item', async () => {
    const onSelect = jest.fn()
    render(<Demo onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Options' }), { key: 'Enter' })

    await screen.findByRole('menu')
    const section = document.querySelector('section[aria-label="Dropdown menu"]')
    expect(section).not.toBeNull()
    expect(screen.getByText('Actions').classList.contains('pl-8')).toBe(true)
    expect(screen.getByText('Enter').classList.contains('ml-auto')).toBe(true)
    expect(screen.getByRole('menuitem', { name: 'Disabled' }).getAttribute('data-disabled')).not.toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: /^Open/ }))
    expect(onSelect).toHaveBeenCalledWith('open')
  })

  it('handles checkbox, radio, submenu, and non-portalled content branches', async () => {
    const onSelect = jest.fn()
    render(
      <DropdownMenu open>
        <DropdownMenuContent portalled={false}>
          <DropdownMenuCheckboxItem checked onCheckedChange={(checked) => onSelect(`checked:${checked}`)}>Pinned</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="one" onValueChange={(value) => onSelect(`choice:${value}`)}>
            <DropdownMenuRadioItem value="one">One</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="two">Two</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => onSelect('nested')}>Nested action</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }))
    expect(onSelect).toHaveBeenCalledWith('checked:false')
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Two' }))
    expect(onSelect).toHaveBeenCalledWith('choice:two')
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'More' }), { key: 'ArrowRight' })
    expect(await screen.findByRole('menuitem', { name: 'Nested action' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nested action' }))
    expect(onSelect).toHaveBeenCalledWith('nested')
  })
})
