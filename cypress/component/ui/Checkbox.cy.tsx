import React from 'react'
import { Checkbox } from '@ui/web/components/ui/checkbox'

describe('Checkbox Component', () => {
  it('renders checkbox in unchecked state by default', () => {
    cy.mount(<Checkbox />)
    
    cy.get('button[role="checkbox"]')
      .should('exist')
      .and('have.attr', 'data-state', 'unchecked')
  })

  it('toggles checkbox when clicked', () => {
    cy.mount(<Checkbox />)
    
    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'unchecked')
    
    cy.get('button[role="checkbox"]').click()
    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'checked')
    
    cy.get('button[role="checkbox"]').click()
    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'unchecked')
  })

  it('calls onCheckedChange callback', () => {
    const onCheckedChange = cy.stub().as('onCheckedChange')
    
    cy.mount(<Checkbox onCheckedChange={onCheckedChange} />)
    
    cy.get('button[role="checkbox"]').click()
    
    cy.get('@onCheckedChange').should('have.been.calledWith', true)
  })

  it('supports controlled state', () => {
    const ControlledCheckbox = () => {
      const [checked, setChecked] = React.useState(false)
      
      return (
        <div>
          <button onClick={() => setChecked(!checked)}>Toggle</button>
          <Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} />
        </div>
      )
    }

    cy.mount(<ControlledCheckbox />)

    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'unchecked')
    
    cy.contains('Toggle').click()
    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'checked')
  })

  it('renders in checked state when defaultChecked is true', () => {
    cy.mount(<Checkbox defaultChecked={true} />)
    
    cy.get('button[role="checkbox"]').should('have.attr', 'data-state', 'checked')
  })

  it('shows check icon when checked', () => {
    cy.mount(<Checkbox defaultChecked={true} />)
    
    // Check icon should be visible
    cy.get('button[role="checkbox"]').find('svg').should('exist')
  })

  it('disables checkbox when disabled prop is true', () => {
    cy.mount(<Checkbox disabled />)
    
    cy.get('button[role="checkbox"]')
      .should('be.disabled')
      .and('have.attr', 'data-disabled')
  })

  it('applies custom className', () => {
    cy.mount(<Checkbox className="custom-checkbox-class" />)
    
    cy.get('.custom-checkbox-class').should('exist')
  })
})

