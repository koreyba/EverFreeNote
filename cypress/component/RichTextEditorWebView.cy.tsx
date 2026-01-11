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

  it('does not jump to end when clicking internal gaps, but appends on bottom tail clicks', () => {
    cy.mount(
      <RichTextEditorWebView
        initialContent="<h1>Title</h1><p>AAA</p>"
      />
    )

    // Internal gap click: between h1 and p (or near p top if margins collapse)
    cy.get('.ProseMirror').then(($pm) => {
      const root = $pm[0] as HTMLElement
      const h1 = root.querySelector('h1') as HTMLElement | null
      const p = root.querySelector('p') as HTMLElement | null
      expect(h1, 'heading exists').to.exist
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const h1Rect = (h1 as HTMLElement).getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const gapTop = h1Rect.bottom
      const gapBottom = pRect.top
      const yClient = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : pRect.top + 2

      const x = Math.floor(rootRect.width / 2)
      const y = Math.max(2, Math.floor(yClient - rootRect.top))

      cy.wrap($pm).click(x, y, { force: true })
    })

    cy.get('.ProseMirror').type('X')

    // Should not append to paragraph end
    cy.get('.ProseMirror').find('p').first().invoke('text').then((text) => {
      expect(text.trim().endsWith('X')).to.eq(false)
    })

    // Bottom tail click: below paragraph bottom within the editor bounds
    cy.get('.ProseMirror').then(($pm) => {
      const root = $pm[0] as HTMLElement
      const p = root.querySelector('p') as HTMLElement | null
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const x = Math.floor(rootRect.width / 2)
      const y = Math.min(Math.floor(rootRect.height - 5), Math.floor(pRect.bottom - rootRect.top + 60))

      cy.wrap($pm).click(x, y, { force: true })
    })

    cy.get('.ProseMirror').type('Y')
    cy.get('.ProseMirror').find('p').first().invoke('text').then((text) => {
      expect(text.trim().endsWith('Y')).to.eq(true)
    })
  })

  it('moves caret to start when clicking above first block, and keeps native behavior for right-of-line clicks', () => {
    cy.mount(
      <RichTextEditorWebView
        initialContent="<h1>Title</h1><p>First</p><p>Second</p>"
      />
    )

    // Above-first-block click (inside editor padding area)
    cy.get('.ProseMirror').then(($pm) => {
      const root = $pm[0] as HTMLElement
      const first = root.querySelector('h1, p, ul, ol') as HTMLElement | null
      expect(first, 'first block exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const firstRect = (first as HTMLElement).getBoundingClientRect()

      const x = 1
      const y = Math.max(1, Math.floor(firstRect.top - rootRect.top - 4))

      cy.wrap($pm).click(x, y, { force: true })
    })

    cy.get('.ProseMirror').type('X')
    cy.get('.ProseMirror').invoke('text').then((text) => {
      expect(text.trim().startsWith('X')).to.eq(true)
    })

    // Right-of-line click inside the first paragraph should be handled by ProseMirror (not overridden)
    cy.get('.ProseMirror').then(($pm) => {
      const root = $pm[0] as HTMLElement
      const p1 = root.querySelectorAll('p')[0] as HTMLElement | undefined
      expect(p1, 'first paragraph exists').to.exist

      const pRect = (p1 as HTMLElement).getBoundingClientRect()
      const x = Math.max(1, Math.floor(pRect.width - 2))
      const y = Math.max(1, Math.floor(pRect.height / 2))

      cy.wrap(p1 as HTMLElement).click(x, y, { force: true })
    })

    cy.get('.ProseMirror').type('Y')
    cy.get('.ProseMirror').find('p').eq(0).invoke('text').then((text) => {
      expect(text.trim().endsWith('Y')).to.eq(true)
    })
  })
})
