import React from 'react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with default props', () => {
    cy.mount(<Button>Default Button</Button>)

    cy.get('button').should('be.visible')
    cy.get('button').should('contain', 'Default Button')
    cy.get('button').should('have.class', 'inline-flex')
    cy.get('button').should('have.class', 'items-center')
    cy.get('button').should('have.class', 'justify-center')
  })

  it('renders different variants correctly', () => {
    cy.mount(
      <div>
        <Button variant="default" data-cy="default-btn">Default</Button>
        <Button variant="destructive" data-cy="destructive-btn">Destructive</Button>
        <Button variant="outline" data-cy="outline-btn">Outline</Button>
        <Button variant="secondary" data-cy="secondary-btn">Secondary</Button>
        <Button variant="ghost" data-cy="ghost-btn">Ghost</Button>
        <Button variant="link" data-cy="link-btn">Link</Button>
      </div>
    )

    // Проверяем что все кнопки отображаются
    cy.get('[data-cy="default-btn"]').should('be.visible')
    cy.get('[data-cy="destructive-btn"]').should('be.visible')
    cy.get('[data-cy="outline-btn"]').should('be.visible')
    cy.get('[data-cy="secondary-btn"]').should('be.visible')
    cy.get('[data-cy="ghost-btn"]').should('be.visible')
    cy.get('[data-cy="link-btn"]').should('be.visible')
  })

  it('renders different sizes correctly', () => {
    cy.mount(
      <div>
        <Button size="sm" data-cy="sm-btn">Small</Button>
        <Button size="default" data-cy="default-size-btn">Default</Button>
        <Button size="lg" data-cy="lg-btn">Large</Button>
        <Button size="icon" data-cy="icon-btn">Icon</Button>
      </div>
    )

    // Проверяем что все размеры отображаются
    cy.get('[data-cy="sm-btn"]').should('be.visible')
    cy.get('[data-cy="default-size-btn"]').should('be.visible')
    cy.get('[data-cy="lg-btn"]').should('be.visible')
    cy.get('[data-cy="icon-btn"]').should('be.visible')
  })

  it('handles click events', () => {
    const onClickSpy = cy.spy().as('onClickSpy')

    cy.mount(<Button onClick={onClickSpy} data-cy="click-btn">Click me</Button>)

    cy.get('[data-cy="click-btn"]').click()
    cy.get('@onClickSpy').should('have.been.calledOnce')
  })

  it('handles disabled state', () => {
    const onClickSpy = cy.spy().as('onClickSpy')

    cy.mount(<Button disabled onClick={onClickSpy} data-cy="disabled-btn">Disabled</Button>)

    cy.get('[data-cy="disabled-btn"]').should('be.disabled')
    cy.get('[data-cy="disabled-btn"]').should('have.class', 'disabled:pointer-events-none')
    cy.get('[data-cy="disabled-btn"]').should('have.class', 'disabled:opacity-50')

    // Клик должен быть заблокирован
    cy.get('[data-cy="disabled-btn"]').click({ force: true })
    cy.get('@onClickSpy').should('not.have.been.called')
  })

  it('renders with custom className', () => {
    cy.mount(<Button className="custom-class" data-cy="custom-btn">Custom</Button>)

    cy.get('[data-cy="custom-btn"]').should('have.class', 'custom-class')
  })

  it('renders with asChild prop using Slot', () => {
    cy.mount(
      <Button asChild>
        <a href="#" data-cy="link-btn">Link Button</a>
      </Button>
    )

    cy.get('[data-cy="link-btn"]').should('be.visible')
    cy.get('[data-cy="link-btn"]').should('have.attr', 'href', '#')
  })

  it('handles icon positioning and sizing', () => {
    cy.mount(
      <Button data-cy="icon-btn">
        <svg data-cy="test-icon" width="16" height="16" viewBox="0 0 24 24"></svg>
        With Icon
      </Button>
    )

    cy.get('[data-cy="icon-btn"]').should('be.visible')
    cy.get('[data-cy="test-icon"]').should('be.visible')
    cy.get('[data-cy="test-icon"]').should('have.attr', 'width', '16')
  })
})
