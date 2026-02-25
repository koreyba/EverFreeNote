import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

function mountEditor(content = '') {
  const spy = cy.spy().as('onChange')
  cy.mount(
    <RichTextEditor
      initialContent={content}
      onContentChange={spy}
    />
  )
}

describe('RichTextEditor — Apply as Markdown button', () => {
  describe('button state', () => {
    it('renders the MD button in the toolbar', () => {
      mountEditor('')
      cy.get('[data-cy="apply-markdown-button"]').should('be.visible')
    })

    it('is disabled when no text is selected', () => {
      mountEditor('<p>Some text</p>')
      cy.get('[data-cy="apply-markdown-button"]').should('be.disabled')
    })

    it('becomes enabled after selecting text', () => {
      mountEditor('<p>Some text</p>')
      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').should('not.be.disabled')
    })

    it('becomes disabled again after deselecting (pressing Escape)', () => {
      mountEditor('<p>Some text</p>')
      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').should('not.be.disabled')
      cy.get('.ProseMirror').type('{end}')
      cy.get('[data-cy="apply-markdown-button"]').should('be.disabled')
    })
  })

  describe('markdown rendering', () => {
    it('converts selected low-score markdown text to rendered list', () => {
      // Separate <p> elements mirror how TipTap stores plain-pasted text.
      // \n\n inside a single <p> is collapsed by the HTML parser and loses structure.
      mountEditor('<p>Project notes</p><p>- Buy milk</p><p>- Call dentist</p><p>- Review PR</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      cy.get('[data-cy="editor-content"]').find('ul').should('exist')
      cy.get('[data-cy="editor-content"]').find('li').should('have.length.gte', 3)
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Buy milk')
    })

    it('converts selected heading markdown to h1 element', () => {
      mountEditor('<p># Main Title\n\nContent below</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      cy.get('[data-cy="editor-content"]').find('h1').should('exist').and('contain.text', 'Main Title')
    })

    it('preserves paragraph breaks between blocks after applying markdown', () => {
      // Regression for \n vs \n\n bug: single \n collapsed all paragraphs into one
      mountEditor('<p>**First block**</p><p>**Second block**</p><p>**Third block**</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      // Must have 3 separate strong elements, not one merged paragraph
      cy.get('[data-cy="editor-content"]').find('strong').should('have.length', 3)
      cy.get('[data-cy="editor-content"]').should('contain.text', 'First block')
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Second block')
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Third block')
    })

    it('strips XSS tags from forced markdown input', () => {
      // Use HTML-escaped script tag so TipTap stores it as literal text, not strips it as a tag.
      // textBetween then extracts the raw string, which SmartPasteService must sanitize.
      mountEditor('<p># Title</p><p>&lt;script&gt;alert(1)&lt;/script&gt;</p><p>Paragraph</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      cy.get('[data-cy="editor-content"]').should('not.contain.html', '<script>')
      cy.get('[data-cy="editor-content"]').find('h1').should('exist')
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Paragraph')
    })

    it('calls onContentChange after applying markdown', () => {
      mountEditor('<p>- Item one\n- Item two</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      cy.get('@onChange').should('have.been.called')
    })

    it('text without markdown syntax remains as paragraph without crashing', () => {
      mountEditor('<p>Just plain text with no markdown</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')
      cy.get('[data-cy="apply-markdown-button"]').click()

      // No crash, text still present
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Just plain text with no markdown')
    })
  })

  describe('early returns — no crash', () => {
    it('clicking disabled button (no selection) does not modify content', () => {
      mountEditor('<p>Unchanged</p>')
      cy.get('[data-cy="apply-markdown-button"]').click({ force: true })
      cy.get('[data-cy="editor-content"]').should('contain.text', 'Unchanged')
      cy.get('@onChange').should('not.have.been.called')
    })
  })
})
