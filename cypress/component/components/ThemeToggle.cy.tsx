import React from 'react'
import { ThemeToggle } from '@ui/web/components/theme-toggle'
import { ThemeProvider } from 'next-themes'

describe('ThemeToggle', () => {
  it('toggles theme correctly', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>
    )
    
    // Initially light. isDark = false.
    // Should show Moon icon.
    // Title should be "Switch to dark mode".
    cy.get('button').should('have.attr', 'title', 'Switch to dark mode')
    
    // Click to toggle
    cy.get('button').click()
    
    // Should now be dark.
    // Should show Sun icon.
    // Title should be "Switch to light mode".
    cy.get('button').should('have.attr', 'title', 'Switch to light mode')
    
    // Check if 'dark' class is applied to html element
    cy.get('html').should('have.class', 'dark')
    
    // Click again to toggle back
    cy.get('button').click()
    
    cy.get('button').should('have.attr', 'title', 'Switch to dark mode')
    cy.get('html').should('not.have.class', 'dark')
  })
})
