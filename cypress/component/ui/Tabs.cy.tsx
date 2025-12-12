import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/web/components/ui/tabs'

describe('Tabs Component', () => {
  it('renders tabs with triggers and content', () => {
    cy.mount(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    cy.contains('Tab 1').should('be.visible')
    cy.contains('Tab 2').should('be.visible')
    cy.contains('Content 1').should('be.visible')
  })

  it('switches content when clicking different tabs', () => {
    cy.mount(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    cy.contains('Content 1').should('be.visible')
    cy.contains('Content 2').should('not.exist')

    cy.contains('Tab 2').click()
    
    cy.contains('Content 2').should('be.visible')
    cy.contains('Content 1').should('not.exist')
  })

  it('highlights active tab', () => {
    cy.mount(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    cy.contains('Tab 1').should('have.attr', 'data-state', 'active')
    cy.contains('Tab 2').should('have.attr', 'data-state', 'inactive')

    cy.contains('Tab 2').click()
    
    cy.contains('Tab 2').should('have.attr', 'data-state', 'active')
    cy.contains('Tab 1').should('have.attr', 'data-state', 'inactive')
  })

  it('supports controlled state', () => {
    const ControlledTabs = () => {
      const [value, setValue] = React.useState('tab1')
      
      return (
        <div>
          <button onClick={() => setValue('tab2')}>Switch to Tab 2</button>
          <Tabs value={value} onValueChange={setValue}>
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content 1</TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
          </Tabs>
        </div>
      )
    }

    cy.mount(<ControlledTabs />)

    cy.contains('Content 1').should('be.visible')
    
    cy.contains('Switch to Tab 2').click()
    cy.contains('Content 2').should('be.visible')
  })

  it('applies custom className', () => {
    cy.mount(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list-class">
          <TabsTrigger value="tab1" className="custom-trigger-class">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-content-class">Content 1</TabsContent>
      </Tabs>
    )

    cy.get('.custom-list-class').should('exist')
    cy.get('.custom-trigger-class').should('exist')
    cy.get('.custom-content-class').should('exist')
  })
})

