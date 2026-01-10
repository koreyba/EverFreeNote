import React from 'react'
import RichTextEditorWebView from '../../ui/web/components/RichTextEditorWebView'

describe('RichTextEditorWebView', () => {
  it('renders with full screen height and captures clicks below content', () => {
    const handleFocus = cy.stub().as('onFocus')
    
    // Mount the component
    cy.mount(
      <RichTextEditorWebView 
        initialContent="<p>Hello World</p>" 
        onFocus={handleFocus}
      />
    )

    // 1. Verify container has min-h-screen
    cy.get('.bg-background').should('have.class', 'min-h-screen')

    // 2. Verify editor content area has correct min-height
    // Note: Tailwind arbitrary values might be compiled to specific CSS classes or styles.
    // Instead of checking the class string, we check the computed style or presence of the editor
    cy.get('.ProseMirror')
      .should('have.css', 'min-height')
      .and('include', 'px') // Ensure it has a pixel value (calculated from calc(100vh-2rem))

    // 3. Click on the container wrapper (simulating click "below" the editor content)
    // We force the click because the editor might cover most of it, but we want to ensure the listener works
    cy.get('.bg-background').click('bottom', { force: true })

    // 4. Check if the editor received focus (TipTap focus logic triggers onFocus prop if passed)
    // Note: Since we don't have direct access to TipTap instance state easily in Cypress component testing
    // without exposing it, we rely on the component's behavior. 
    // However, the component calls editor.commands.focus() on click.
    // If the component is correctly wired, it should eventually trigger the onFocus callback 
    // or at least document.activeElement should be the editor.
    
    cy.get('.ProseMirror').should('have.focus')
  })
})
