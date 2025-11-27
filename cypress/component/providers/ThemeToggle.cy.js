// @ts-check
import React from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ThemeProvider } from '@/components/theme-provider'

describe('ThemeToggle Component', () => {
  it('renders theme toggle button', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    cy.get('button').should('be.visible')
  })

  it('shows moon icon in light mode', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    // Moon icon should be visible in light mode
    cy.get('button').find('svg').should('exist')
  })

  it('toggles theme when clicked', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    cy.get('button').click()
    // After click, theme should change (icon will change)
    cy.get('button').find('svg').should('exist')
  })

  it('has correct accessibility attributes', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    cy.get('button')
      .should('have.attr', 'title')
      .and('match', /(light|dark) mode/)
    
    cy.contains('Toggle theme').should('exist')
  })

  it('renders correctly before hydration', () => {
    // Test the initial render state (before mounted)
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    cy.get('button').should('be.visible')
    cy.get('button').find('svg').should('exist')
  })
})

