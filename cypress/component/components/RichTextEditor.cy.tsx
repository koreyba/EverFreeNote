import React from 'react'
import RichTextEditor from '@ui/web/components/RichTextEditor'
import { browser } from '@ui/web/adapters/browser'

// Helper type for Sinon stubs
type SinonStub = ReturnType<typeof cy.stub>

describe('RichTextEditor', () => {
  beforeEach(() => {
    // Mock browser.prompt
    // We check if it's already stubbed to avoid double-stubbing errors if Cypress re-runs
    const promptStub = browser.prompt as unknown as SinonStub
    if (promptStub.restore) {
        promptStub.restore()
    }
    cy.stub(browser, 'prompt').as('promptStub').returns('http://example.com')
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

  describe('Text Formatting', () => {
    beforeEach(() => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
    })

    it('toggles bold', () => {
        cy.get('[data-cy="bold-button"]').click()
        cy.get('.ProseMirror strong').should('exist')
    })

    it('toggles italic', () => {
        cy.get('[data-cy="italic-button"]').click()
        cy.get('.ProseMirror em').should('exist')
    })

    it('toggles underline', () => {
        cy.get('[data-cy="underline-button"]').click()
        cy.get('.ProseMirror u').should('exist')
    })

    it('toggles strike', () => {
        cy.get('[data-cy="strike-button"]').click()
        cy.get('.ProseMirror s').should('exist')
    })

    it('toggles highlight', () => {
        cy.get('[data-cy="highlight-button"]').click()
        cy.get('.ProseMirror mark').should('exist')
    })

    it('toggles superscript', () => {
        cy.get('[data-cy="superscript-button"]').click()
        cy.get('.ProseMirror sup').should('exist')
    })

    it('toggles subscript', () => {
        cy.get('[data-cy="subscript-button"]').click()
        cy.get('.ProseMirror sub').should('exist')
    })
  })

  describe('Headings and Paragraphs', () => {
    beforeEach(() => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
    })

    it('sets H1', () => {
        cy.get('[data-cy="h1-button"]').click()
        cy.get('.ProseMirror h1').should('exist')
    })

    it('sets H2', () => {
        cy.get('[data-cy="h2-button"]').click()
        cy.get('.ProseMirror h2').should('exist')
    })

    it('sets H3', () => {
        cy.get('[data-cy="h3-button"]').click()
        cy.get('.ProseMirror h3').should('exist')
    })

    it('sets paragraph', () => {
        // First set to H1
        cy.get('[data-cy="h1-button"]').click()
        cy.get('.ProseMirror h1').should('exist')
        // Then back to paragraph
        cy.get('[data-cy="paragraph-button"]').click()
        cy.get('.ProseMirror p').should('exist')
        cy.get('.ProseMirror h1').should('not.exist')
    })
  })

  describe('Lists', () => {
    beforeEach(() => {
        cy.mount(<RichTextEditor content="<p>Item 1</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
    })

    it('toggles bullet list', () => {
        cy.get('[data-cy="bullet-list-button"]').click()
        cy.get('.ProseMirror ul li').should('exist')
    })

    it('toggles ordered list', () => {
        cy.get('[data-cy="ordered-list-button"]').click()
        cy.get('.ProseMirror ol li').should('exist')
    })

    it('toggles task list', () => {
        cy.get('[data-cy="task-list-button"]').click()
        // Check for checkbox input which is characteristic of task items
        cy.get('.ProseMirror input[type="checkbox"]').should('exist')
    })
  })

  describe('Alignment', () => {
    beforeEach(() => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
    })

    it('aligns left', () => {
        cy.get('[data-cy="align-left-button"]').click()
        cy.get('.ProseMirror p').should('have.css', 'text-align', 'left')
    })

    it('aligns center', () => {
        cy.get('[data-cy="align-center-button"]').click()
        cy.get('.ProseMirror p').should('have.css', 'text-align', 'center')
    })

    it('aligns right', () => {
        cy.get('[data-cy="align-right-button"]').click()
        cy.get('.ProseMirror p').should('have.css', 'text-align', 'right')
    })
  })

  describe('Indentation', () => {
    it.skip('indents and outdents list items', () => {
        // Start with a nested list
        cy.mount(<RichTextEditor content="<ul><li>Item 1<ul><li>Item 2</li></ul></li></ul>" onChange={cy.spy()} />)
        
        // Click on Item 2 to place cursor
        cy.contains('Item 2').click()
        
        // Outdent button should be enabled
        cy.get('[data-cy="outdent-button"]').should('not.be.disabled')
        
        // Outdent
        cy.get('[data-cy="outdent-button"]').click()
        
        // Check if nested list is gone (flattened)
        cy.get('.ProseMirror ul ul').should('not.exist')
        
        // Now Indent button should be enabled (since we just lifted it, it can be sunk back)
        cy.get('[data-cy="indent-button"]').should('not.be.disabled')
        
        // Indent
        cy.get('[data-cy="indent-button"]').click()
        
        // Check for nested list
        cy.get('.ProseMirror ul ul li').should('contain.text', 'Item 2')
    })
  })

  describe('Advanced Formatting', () => {
    it('changes font family', () => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
        
        cy.get('[data-cy="font-family-select"]').click()
        // Use Monospace as it's distinct
        cy.get('[role="option"]').contains('Monospace').click()
        
        // Check for any element with font-family style
        cy.get('.ProseMirror span[style*="font-family"]').should('exist')
    })

    it('changes font size', () => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
        
        cy.get('[data-cy="font-size-select"]').click()
        cy.get('[role="option"]').contains('24 pt').click()
        
        cy.get('.ProseMirror span').should('have.css', 'font-size', '32px') // 24pt is approx 32px
    })

    it('changes text color', () => {
        cy.mount(<RichTextEditor content="<p>Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
        
        cy.get('[data-cy="color-button"]').click()
        // TwitterPicker renders colors in divs with title attribute or just colors
        // We can click the first color swatch
        cy.get('.twitter-picker span div').first().click()
        
        cy.get('.ProseMirror span').should('have.attr', 'style').and('include', 'color')
    })
  })

  describe('Media and Links', () => {
    it('inserts link', () => {
        cy.mount(<RichTextEditor content="<p>Link Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
        cy.get('[data-cy="link-button"]').click()
        
        cy.get('@promptStub').should('have.been.calledWith', 'URL')
        cy.get('.ProseMirror a').should('have.attr', 'href', 'http://example.com')
    })

    it('does not insert link if prompt cancelled', () => {
        (browser.prompt as unknown as SinonStub).returns(null)
        cy.mount(<RichTextEditor content="<p>Link Text</p>" onChange={cy.spy()} />)
        cy.get('.ProseMirror').type('{selectall}')
        cy.get('[data-cy="link-button"]').click()
        
        cy.get('.ProseMirror a').should('not.exist')
    })

    it('inserts image', () => {
        cy.mount(<RichTextEditor content="" onChange={cy.spy()} />)
        cy.get('[data-cy="image-button"]').click()
        
        cy.get('@promptStub').should('have.been.calledWith', 'Image URL:')
        cy.get('.ProseMirror img').should('have.attr', 'src', 'http://example.com')
    })

    it('does not insert image if prompt cancelled', () => {
        (browser.prompt as unknown as SinonStub).returns(null)
        cy.mount(<RichTextEditor content="" onChange={cy.spy()} />)
        cy.get('[data-cy="image-button"]').click()
        
        cy.get('.ProseMirror img').should('not.exist')
    })
  })
})
