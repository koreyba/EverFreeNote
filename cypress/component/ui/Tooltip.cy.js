// @ts-check
import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

describe('Tooltip Component', () => {
  it('renders tooltip trigger', () => {
    cy.mount(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip content</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    cy.contains('Hover me').should('be.visible')
  })

  it('tooltip content is hidden by default', () => {
    cy.mount(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip content</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    cy.contains('Tooltip content').should('not.exist')
  })

  it('shows tooltip on focus', () => {
    cy.mount(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Focus me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip content</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    cy.contains('Focus me').focus()
    cy.wait(100)
    cy.contains('Tooltip content').should('be.visible')
  })

  it('applies custom className to tooltip content when open', () => {
    cy.mount(
      <TooltipProvider>
        <Tooltip defaultOpen={true}>
          <TooltipTrigger asChild>
            <Button>Trigger</Button>
          </TooltipTrigger>
          <TooltipContent className="custom-tooltip-class">
            <p>Tooltip content</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    cy.get('.custom-tooltip-class').should('exist')
  })

  it('supports controlled state', () => {
    const ControlledTooltip = () => {
      const [open, setOpen] = React.useState(false)
      
      return (
        <TooltipProvider>
          <div>
            <button onClick={() => setOpen(!open)}>Toggle Tooltip</button>
            <Tooltip open={open} onOpenChange={setOpen}>
              <TooltipTrigger asChild>
                <Button>Trigger</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Controlled tooltip</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )
    }

    cy.mount(<ControlledTooltip />)

    cy.contains('Controlled tooltip').should('not.exist')
    
    cy.contains('Toggle Tooltip').click()
    cy.contains('Controlled tooltip').should('be.visible')
  })
})

