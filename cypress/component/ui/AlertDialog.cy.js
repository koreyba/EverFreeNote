// @ts-check
import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

describe('AlertDialog Component', () => {
  it('renders trigger button', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').should('be.visible')
  })

  it('opens alert dialog when trigger is clicked', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.contains('Are you absolutely sure?').should('be.visible')
    cy.contains('This action cannot be undone.').should('be.visible')
  })

  it('calls action callback when action button is clicked', () => {
    const onAction = cy.stub().as('onAction')

    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.contains('Continue').click()
    
    cy.get('@onAction').should('have.been.calledOnce')
  })

  it('closes dialog when cancel button is clicked', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.contains('Are you sure?').should('be.visible')
    
    cy.contains('Cancel').click()
    cy.contains('Are you sure?').should('not.exist')
  })

  it('closes dialog when action button is clicked', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.contains('Are you sure?').should('be.visible')
    
    cy.contains('Continue').click()
    cy.contains('Are you sure?').should('not.exist')
  })

  it('supports controlled state', () => {
    const ControlledAlertDialog = () => {
      const [open, setOpen] = React.useState(false)
      
      return (
        <div>
          <Button onClick={() => setOpen(true)}>Open Alert</Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Controlled Alert</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }

    cy.mount(<ControlledAlertDialog />)

    cy.contains('Controlled Alert').should('not.exist')
    
    cy.contains('Open Alert').click()
    cy.contains('Controlled Alert').should('be.visible')
    
    cy.contains('Cancel').click()
    cy.contains('Controlled Alert').should('not.exist')
  })

  it('renders with proper button styling', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    
    // Cancel should have outline variant
    cy.contains('Cancel').should('have.class', 'border')
    
    // Continue should have default button styling
    cy.contains('Continue').should('be.visible')
  })

  it('applies custom className to AlertDialogContent', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="custom-alert-class">
          <AlertDialogHeader>
            <AlertDialogTitle>Test Alert</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.get('.custom-alert-class').should('exist')
  })

  it('renders overlay with proper styling', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Test Alert</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    
    // Check overlay exists
    cy.get('[class*="fixed"][class*="inset-0"][class*="bg-black"]').should('exist')
  })

  it('prevents closing on overlay click (AlertDialog behavior)', () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    cy.contains('Delete').click()
    cy.contains('Are you sure?').should('be.visible')
    
    // Try to click overlay
    cy.get('body').click(5, 5, { force: true })
    
    // AlertDialog should still be visible (doesn't close on overlay click)
    cy.contains('Are you sure?').should('be.visible')
  })
})

