import React from 'react'
import RichTextEditor from '@/components/RichTextEditor'
import { browser } from '@/lib/adapters/browser'

// Helper type for Sinon stubs
type SinonStub = ReturnType<typeof cy.stub>

describe('RichTextEditor', () => {
  beforeEach(() => {
    // Mock browser.prompt
    const promptStub = browser.prompt as unknown as SinonStub
    if (!promptStub.restore) {
        cy.stub(browser, 'prompt').returns('http://example.com')
    } else {
        promptStub.resetHistory();
        promptStub.returns('http://example.com');
    }
  })

  it('renders with initial content', () => {
    cy.mount(
      <RichTextEditor
        content="<p>Initial Content</p>"
        onChange={cy.spy()}
      />
    )
    cy.get('.ProseMirror').should('contain.text', 'Initial Content')
  })

  it('updates content when typing', () => {
    const onChange = cy.spy().as('onChange')
    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChange}
      />
    )
    cy.get('.ProseMirror').type('Hello World')
    cy.get('@onChange').should('have.been.called')
  })

  it('toggles bold formatting', () => {
    cy.mount(
      <RichTextEditor
        content="<p>Text</p>"
        onChange={cy.spy()}
      />
    )
    // Select text
    cy.get('.ProseMirror').type('{selectall}')
    // Click bold button
    cy.get('[data-cy="bold-button"]').click()
    
    // Check if text is bold (strong tag)
    cy.get('.ProseMirror strong').should('exist')
  })

  it('toggles italic formatting', () => {
    cy.mount(
      <RichTextEditor
        content="<p>Text</p>"
        onChange={cy.spy()}
      />
    )
    cy.get('.ProseMirror').type('{selectall}')
    cy.get('[data-cy="italic-button"]').click()
    
    // Check if text is italic (em tag)
    cy.get('.ProseMirror em').should('exist')
  })

  it('inserts link', () => {
    cy.mount(
      <RichTextEditor
        content="<p>Link Text</p>"
        onChange={cy.spy()}
      />
    )
    cy.get('.ProseMirror').type('{selectall}')
    cy.get('[data-cy="link-button"]').click()
    
    // Should call browser.prompt
    cy.wrap(browser.prompt).should('have.been.calledWith', 'URL')
    
    // Should insert link
    cy.get('.ProseMirror a').should('have.attr', 'href', 'http://example.com')
  })

  it('inserts image', () => {
    cy.mount(
      <RichTextEditor
        content=""
        onChange={cy.spy()}
      />
    )
    cy.get('[data-cy="image-button"]').click()
    
    // Should call browser.prompt
    cy.wrap(browser.prompt).should('have.been.calledWith', 'Image URL:')
    
    // Should insert image
    cy.get('.ProseMirror img').should('have.attr', 'src', 'http://example.com')
  })
})
