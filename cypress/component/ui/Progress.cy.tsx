import React from 'react'
import { Progress } from '@/components/ui/progress'

describe('Progress Component', () => {
  it('renders progress bar', () => {
    cy.mount(<Progress value={50} />)
    
    cy.get('[role="progressbar"]').should('exist')
  })

  it('displays correct progress value', () => {
    cy.mount(<Progress value={75} />)
    
    // Check the indicator transform style
    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(-25%)')
  })

  it('renders with 0% progress', () => {
    cy.mount(<Progress value={0} />)
    
    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(-100%)')
  })

  it('renders with 100% progress', () => {
    cy.mount(<Progress value={100} />)
    
    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(0%)')
  })

  it('updates progress value dynamically', () => {
    const DynamicProgress = () => {
      const [value, setValue] = React.useState(0)
      
      return (
        <div>
          <button onClick={() => setValue(50)}>Set 50%</button>
          <button onClick={() => setValue(100)}>Set 100%</button>
          <Progress value={value} />
        </div>
      )
    }

    cy.mount(<DynamicProgress />)

    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(-100%)')
    
    cy.contains('Set 50%').click()
    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(-50%)')
    
    cy.contains('Set 100%').click()
    cy.get('[role="progressbar"]').find('[class*="bg-primary"]')
      .should('have.attr', 'style')
      .and('include', 'translateX(0%)')
  })

  it('applies custom className', () => {
    cy.mount(<Progress value={50} className="custom-progress-class" />)
    
    cy.get('.custom-progress-class').should('exist')
  })
})

