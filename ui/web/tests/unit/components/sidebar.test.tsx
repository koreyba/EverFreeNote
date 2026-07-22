import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

let mockIsMobile = false

jest.mock('@ui/web/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

function SidebarState() {
  const { state, openMobile } = useSidebar()
  return <output data-testid="sidebar-state">{`${state}:${openMobile}`}</output>
}

function renderSidebar(
  children: React.ReactNode = <SidebarContent>Content</SidebarContent>,
  providerProps: React.ComponentProps<typeof SidebarProvider> = {},
) {
  return render(
    <SidebarProvider {...providerProps}>
      <SidebarTrigger />
      <SidebarState />
      <Sidebar>{children}</Sidebar>
    </SidebarProvider>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    mockIsMobile = false
    document.cookie = ''
  })

  it('toggles the desktop sidebar, invokes the trigger callback, and persists the state', async () => {
    const onClick = jest.fn()
    render(
      <SidebarProvider>
        <SidebarTrigger onClick={onClick} />
        <Sidebar data-testid="desktop-sidebar">Desktop content</Sidebar>
      </SidebarProvider>,
    )

    expect(screen.getByTestId('desktop-sidebar').closest('[data-state]')?.getAttribute('data-state')).toBe('expanded')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByTestId('desktop-sidebar').closest('[data-state]')?.getAttribute('data-state')).toBe('collapsed'))
    expect(document.cookie).toContain('sidebar_state=false')
  })

  it('supports controlled state and toggles from the keyboard shortcut with cleanup', () => {
    const onOpenChange = jest.fn()
    const { unmount } = renderSidebar(<SidebarState />, { open: true, onOpenChange })

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(onOpenChange).toHaveBeenCalledWith(false)

    unmount()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
  })

  it('renders the mobile sheet and toggles its mobile state', async () => {
    mockIsMobile = true
    renderSidebar(<div>Mobile content</div>)

    expect(screen.getByTestId('sidebar-state').textContent).toBe('expanded:false')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(await screen.findByText('Mobile content')).toBeTruthy()
    expect(screen.getByTestId('sidebar-state').textContent).toBe('expanded:true')
    expect(screen.getByText('Mobile content').closest('[data-mobile="true"]')).not.toBeNull()
  })

  it('supports the non-collapsible variant without the desktop state wrapper', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" data-testid="plain-sidebar">Plain content</Sidebar>
      </SidebarProvider>,
    )

    expect(screen.getByTestId('plain-sidebar').textContent).toBe('Plain content')
    expect(screen.getByTestId('plain-sidebar').getAttribute('data-state')).toBeNull()
  })

  it('renders menu controls, active states, asChild links, and randomized skeleton content', () => {
    renderSidebar(
      <>
        <SidebarHeader>
          <SidebarInput placeholder="Filter notes" />
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <SidebarGroupAction aria-label="Group action">+</SidebarGroupAction>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive variant="outline" size="sm" tooltip="Notes tooltip">
                Notes
              </SidebarMenuButton>
              <SidebarMenuAction showOnHover aria-label="Note action">...</SidebarMenuAction>
              <SidebarMenuBadge>3</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton href="/notes" size="sm" isActive>Subnote</SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
          <SidebarMenuSkeleton showIcon data-testid="menu-skeleton" />
          <SidebarSeparator />
        </SidebarGroup>
      </>,
    )

    expect(screen.getByPlaceholderText('Filter notes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Notes' }).getAttribute('data-active')).toBe('true')
    expect(screen.getByRole('link', { name: 'Subnote' }).getAttribute('data-active')).toBe('true')
    expect(screen.getByTestId('menu-skeleton').querySelector('[data-sidebar="menu-skeleton-icon"]')).not.toBeNull()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('toggles through the rail and forwards sidebar attributes', async () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarRail />
        <Sidebar side="right" variant="floating" collapsible="icon" data-testid="desktop-sidebar">
          Content
        </Sidebar>
      </SidebarProvider>,
    )

    const sidebar = screen.getByTestId('desktop-sidebar').closest('[data-side]') as HTMLElement
    expect(sidebar.getAttribute('data-side')).toBe('right')
    expect(sidebar.getAttribute('data-variant')).toBe('floating')
    expect(sidebar.getAttribute('data-collapsible')).toBe('icon')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('expanded'))
  })
})
