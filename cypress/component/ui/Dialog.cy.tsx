import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '../../../ui/web/components/ui/dialog'
import { Button } from '../../../ui/web/components/ui/button'

describe('Dialog Component', () => {
  it('renders trigger button', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').should('be.visible')
  })

  it('opens dialog when trigger is clicked', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.contains('Test Dialog').should('be.visible')
    cy.contains('This is a test dialog').should('be.visible')
  })

  it('closes dialog when close button is clicked', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.contains('Test Dialog').should('be.visible')
    
    // Click the X button
    cy.get('[class*="sr-only"]').parent().click()
    
    cy.contains('Test Dialog').should('not.exist')
  })

  it('closes dialog when overlay is clicked', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.contains('Test Dialog').should('be.visible')
    
    // Click overlay (outside dialog content)
    cy.get('body').click(5, 5, { force: true })
    
    cy.contains('Test Dialog').should('not.exist')
  })

  it('closes dialog when ESC key is pressed', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.contains('Test Dialog').should('be.visible')
    
    cy.get('body').type('{esc}')
    
    cy.contains('Test Dialog').should('not.exist')
  })

  it('renders dialog with header, content, and footer', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <div>Dialog Content</div>
          <DialogFooter>
            <Button>Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    
    cy.contains('Dialog Title').should('be.visible')
    cy.contains('Dialog Description').should('be.visible')
    cy.contains('Dialog Content').should('be.visible')
    cy.contains('Action').should('be.visible')
  })

  it('supports controlled state', () => {
    const ControlledDialog = () => {
      const [open, setOpen] = React.useState(false)
      
      return (
        <div>
          <Button onClick={() => setOpen(true)}>Open Controlled</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Controlled Dialog</DialogTitle>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )
    }

    cy.mount(<ControlledDialog />)

    cy.contains('Controlled Dialog').should('not.exist')
    
    cy.contains('Open Controlled').click()
    cy.contains('Controlled Dialog').should('be.visible')
    
    cy.contains('button', 'Close').click()
    cy.contains('Controlled Dialog').should('not.exist')
  })

  it('renders DialogClose component', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.contains('Test Dialog').should('be.visible')
    
    cy.contains('Cancel').click()
    cy.contains('Test Dialog').should('not.exist')
  })

  it('applies custom className to DialogContent', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="custom-dialog-class">
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    cy.get('.custom-dialog-class').should('exist')
  })

  it('renders overlay with proper styling', () => {
    cy.mount(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    cy.contains('Open Dialog').click()
    
    // Check overlay exists and has proper classes
    cy.get('[class*="fixed"][class*="inset-0"][class*="bg-black"]').should('exist')
  })
})

