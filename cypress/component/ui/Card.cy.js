import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

describe('Card Component', () => {
  it('renders basic card structure', () => {
    cy.mount(
      <Card data-cy="basic-card">
        <CardHeader>
          <CardTitle data-cy="card-title">Card Title</CardTitle>
          <CardDescription data-cy="card-description">Card description</CardDescription>
        </CardHeader>
        <CardContent data-cy="card-content">
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter data-cy="card-footer">
          <Button data-cy="card-action">Action</Button>
        </CardFooter>
      </Card>
    )

    cy.get('[data-cy="basic-card"]').should('be.visible')
    cy.get('[data-cy="basic-card"]').should('have.class', 'rounded-xl')
    cy.get('[data-cy="basic-card"]').should('have.class', 'border')
    cy.get('[data-cy="basic-card"]').should('have.class', 'bg-card')

    cy.get('[data-cy="card-title"]').should('contain', 'Card Title')
    cy.get('[data-cy="card-description"]').should('contain', 'Card description')
    cy.get('[data-cy="card-content"]').should('contain', 'Card content goes here')
    cy.get('[data-cy="card-footer"]').should('be.visible')
    cy.get('[data-cy="card-action"]').should('be.visible')
  })

  it('renders card with custom className', () => {
    cy.mount(<Card className="custom-card-class" data-cy="custom-card">Custom Card</Card>)

    cy.get('[data-cy="custom-card"]').should('have.class', 'custom-card-class')
  })

  it('renders minimal card with just content', () => {
    cy.mount(
      <Card data-cy="minimal-card">
        <p>Just some content</p>
      </Card>
    )

    cy.get('[data-cy="minimal-card"]').should('be.visible')
    cy.get('[data-cy="minimal-card"]').should('contain', 'Just some content')
  })

  it('renders card header with proper spacing', () => {
    cy.mount(
      <Card>
        <CardHeader data-cy="header-spacing">
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>
    )

    cy.get('[data-cy="header-spacing"]').should('have.class', 'flex')
    cy.get('[data-cy="header-spacing"]').should('have.class', 'flex-col')
    cy.get('[data-cy="header-spacing"]').should('have.class', 'space-y-1.5')
    cy.get('[data-cy="header-spacing"]').should('have.class', 'p-6')
  })

  it('renders card title with proper styling', () => {
    cy.mount(
      <Card>
        <CardHeader>
          <CardTitle data-cy="title-styling">Styled Title</CardTitle>
        </CardHeader>
      </Card>
    )

    cy.get('[data-cy="title-styling"]').should('have.class', 'font-semibold')
    cy.get('[data-cy="title-styling"]').should('have.class', 'leading-none')
    cy.get('[data-cy="title-styling"]').should('have.class', 'tracking-tight')
  })

  it('renders card description with muted text', () => {
    cy.mount(
      <Card>
        <CardHeader>
          <CardDescription data-cy="description-styling">Muted description</CardDescription>
        </CardHeader>
      </Card>
    )

    cy.get('[data-cy="description-styling"]').should('have.class', 'text-sm')
    cy.get('[data-cy="description-styling"]').should('have.class', 'text-muted-foreground')
  })

  it('renders card content with proper padding', () => {
    cy.mount(
      <Card>
        <CardContent data-cy="content-padding">
          Content
        </CardContent>
      </Card>
    )

    cy.get('[data-cy="content-padding"]').should('have.class', 'p-6')
    cy.get('[data-cy="content-padding"]').should('have.class', 'pt-0')
  })

  it('renders card footer with proper layout', () => {
    cy.mount(
      <Card>
        <CardFooter data-cy="footer-layout">
          <Button>Footer Action</Button>
        </CardFooter>
      </Card>
    )

    cy.get('[data-cy="footer-layout"]').should('have.class', 'flex')
    cy.get('[data-cy="footer-layout"]').should('have.class', 'items-center')
    cy.get('[data-cy="footer-layout"]').should('have.class', 'p-6')
    cy.get('[data-cy="footer-layout"]').should('have.class', 'pt-0')
  })

  it('handles nested card components correctly', () => {
    cy.mount(
      <Card data-cy="nested-card">
        <CardHeader>
          <CardTitle>Parent Card</CardTitle>
          <CardDescription>Parent description</CardDescription>
        </CardHeader>
        <CardContent>
          <Card data-cy="inner-card">
            <CardHeader>
              <CardTitle>Inner Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Inner content</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    )

    cy.get('[data-cy="nested-card"]').should('be.visible')
    cy.get('[data-cy="inner-card"]').should('be.visible')
    cy.get('[data-cy="inner-card"]').should('have.class', 'rounded-xl')
  })
})
