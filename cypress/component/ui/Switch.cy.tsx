import React from 'react'
import { Switch } from '@ui/web/components/ui/switch'

describe('Switch Component', () => {
  it('renders switch in unchecked state by default', () => {
    cy.mount(<Switch />)
    
    cy.get('button[role="switch"]')
      .should('exist')
      .and('have.attr', 'data-state', 'unchecked')
  })

  it('toggles switch when clicked', () => {
    cy.mount(<Switch />)
    
    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'unchecked')
    
    cy.get('button[role="switch"]').click()
    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'checked')
    
    cy.get('button[role="switch"]').click()
    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'unchecked')
  })

  it('calls onCheckedChange callback', () => {
    const onCheckedChange = cy.stub().as('onCheckedChange')
    
    cy.mount(<Switch onCheckedChange={onCheckedChange} />)
    
    cy.get('button[role="switch"]').click()
    
    cy.get('@onCheckedChange').should('have.been.calledWith', true)
  })

  it('supports controlled state', () => {
    const ControlledSwitch = () => {
      const [checked, setChecked] = React.useState(false)
      
      return (
        <div>
          <button onClick={() => setChecked(!checked)}>Toggle</button>
          <Switch checked={checked} onCheckedChange={setChecked} />
        </div>
      )
    }

    cy.mount(<ControlledSwitch />)

    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'unchecked')
    
    cy.contains('Toggle').click()
    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'checked')
  })

  it('renders in checked state when defaultChecked is true', () => {
    cy.mount(<Switch defaultChecked={true} />)
    
    cy.get('button[role="switch"]').should('have.attr', 'data-state', 'checked')
  })

  it('disables switch when disabled prop is true', () => {
    cy.mount(<Switch disabled />)
    
    cy.get('button[role="switch"]')
      .should('be.disabled')
      .and('have.attr', 'data-disabled')
  })

  it('applies custom className', () => {
    cy.mount(<Switch className="custom-switch-class" />)
    
    cy.get('.custom-switch-class').should('exist')
  })
})

