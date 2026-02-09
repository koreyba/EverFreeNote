import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

/**
 * Dispatches a native paste event on the ProseMirror editable element
 * with synthetic clipboardData. ProseMirror intercepts native paste events
 * and routes them through editorProps.handlePaste, which calls SmartPasteService.
 */
function simulatePaste(html: string | null, text: string | null) {
  cy.get('.ProseMirror').then(($el) => {
    const types: string[] = []
    if (html !== null) types.push('text/html')
    if (text !== null) types.push('text/plain')

    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) => {
          if (type === 'text/html') return html ?? ''
          if (type === 'text/plain') return text ?? ''
          return ''
        },
        types,
      },
    })
    $el[0].dispatchEvent(event)
  })
}

function mountEditor(content: string) {
  const spy = cy.spy().as('onChange')
  cy.mount(
    <RichTextEditor
      initialContent={content}
      onContentChange={spy}
    />
  )
}

describe('RichTextEditor – Smart Paste', () => {
  /**
   * Tests for the paragraph-splitting bug:
   * When copying text from ProseMirror, the clipboard HTML wraps content in <p>.
   * Pasting <p>word</p> inside an existing paragraph via insertContent splits it
   * into multiple paragraphs. These tests assert the DESIRED behavior (no split)
   * and should FAIL until the bug is fixed.
   */
  describe('inline paste – single-paragraph clipboard HTML should not split', () => {
    it('does not create extra paragraph when pasting at end of text', () => {
      mountEditor('<p>Hello</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{end}')

      // Simulate paste of text wrapped in <p> (as ProseMirror clipboard does)
      simulatePaste('<p> world</p>', ' world')

      // Should remain a single paragraph
      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror p').should('contain.text', 'Hello world')
    })

    it('does not split paragraph when pasting in the middle of text', () => {
      mountEditor('<p>before after</p>')

      cy.get('[data-cy="editor-content"]').click()
      // Place cursor after "before " using Home + arrow keys
      cy.get('.ProseMirror').type('{home}')
      for (let i = 0; i < 7; i++) {
        cy.get('.ProseMirror').type('{rightarrow}')
      }

      simulatePaste('<p>MIDDLE </p>', 'MIDDLE ')

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror p').should('contain.text', 'before MIDDLE after')
    })

    it('does not split paragraph when pasting bold text from editor clipboard', () => {
      mountEditor('<p>Text here</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{end}')

      // ProseMirror wraps bold text in <p><strong>...</strong></p>
      simulatePaste('<p><strong> bold</strong></p>', ' bold')

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror strong').should('exist').and('contain.text', 'bold')
    })

    it('does not split paragraph when pasting italic text from editor clipboard', () => {
      mountEditor('<p>Text here</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{end}')

      simulatePaste('<p><em> italic</em></p>', ' italic')

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror em').should('exist').and('contain.text', 'italic')
    })

    it('does not split paragraph when pasting a link from editor clipboard', () => {
      mountEditor('<p>Click </p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{end}')

      simulatePaste(
        '<p><a href="https://example.com">here</a></p>',
        'here'
      )

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror a').should('exist').and('contain.text', 'here')
    })
  })

  /**
   * Tests for block-level paste — these should work correctly with current behavior.
   * Multi-element HTML should create proper block structure.
   */
  describe('block paste – multi-element HTML preserves structure', () => {
    it('preserves heading and paragraph structure', () => {
      mountEditor('')
      cy.get('[data-cy="editor-content"]').click()

      simulatePaste(
        '<h1>Title</h1><p>Body text</p>',
        'Title\nBody text'
      )

      cy.get('.ProseMirror').find('h1').should('exist').and('contain.text', 'Title')
      cy.get('.ProseMirror').find('p').should('contain.text', 'Body text')
    })

    it('preserves unordered list structure', () => {
      mountEditor('')
      cy.get('[data-cy="editor-content"]').click()

      simulatePaste(
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
        'Item 1\nItem 2'
      )

      cy.get('.ProseMirror').find('ul').should('exist')
      cy.get('.ProseMirror').find('li').should('have.length', 2)
    })

    it('preserves ordered list structure', () => {
      mountEditor('')
      cy.get('[data-cy="editor-content"]').click()

      simulatePaste(
        '<ol><li>First</li><li>Second</li></ol>',
        '1. First\n2. Second'
      )

      cy.get('.ProseMirror').find('ol').should('exist')
      cy.get('.ProseMirror').find('li').should('have.length', 2)
    })

    it('preserves blockquote', () => {
      mountEditor('')
      cy.get('[data-cy="editor-content"]').click()

      simulatePaste(
        '<blockquote><p>Quoted text</p></blockquote>',
        '> Quoted text'
      )

      cy.get('.ProseMirror').find('blockquote').should('exist')
        .and('contain.text', 'Quoted text')
    })
  })

  /**
   * Comprehensive copy-paste-in-place test:
   * Select all formatted content and paste it back.
   * All formatting types should be preserved.
   */
  describe('comprehensive formatting preservation on paste-in-place', () => {
    it('preserves all formatting when entire rich content is selected and pasted back', () => {
      const richContent = [
        '<h1>Main Title</h1>',
        '<h2>Subtitle</h2>',
        '<p>Text with <strong>bold</strong>, <em>italic</em>, and <u>underline</u>.</p>',
        '<ul><li>Bullet one</li><li>Bullet two</li></ul>',
        '<ol><li>Numbered one</li><li>Numbered two</li></ol>',
        '<blockquote><p>A famous quote</p></blockquote>',
      ].join('')

      mountEditor(richContent)

      // Select all content
      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      // Paste back the same rich HTML (simulating copy-paste in place)
      simulatePaste(
        richContent,
        'Main Title\nSubtitle\nText with bold, italic, and underline.\nBullet one\nBullet two\n1. Numbered one\n2. Numbered two\nA famous quote'
      )

      // All formatting types must be preserved
      cy.get('.ProseMirror h1').should('exist').and('contain.text', 'Main Title')
      cy.get('.ProseMirror h2').should('exist').and('contain.text', 'Subtitle')
      cy.get('.ProseMirror strong').should('exist').and('contain.text', 'bold')
      cy.get('.ProseMirror em').should('exist').and('contain.text', 'italic')
      cy.get('.ProseMirror u').should('exist').and('contain.text', 'underline')
      cy.get('.ProseMirror ul li').should('have.length', 2)
      cy.get('.ProseMirror ol li').should('have.length', 2)
      cy.get('.ProseMirror blockquote').should('exist').and('contain.text', 'A famous quote')
    })

    it('preserves bold formatting when a bold paragraph is pasted back in place', () => {
      mountEditor('<p>Normal <strong>bold</strong> text</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      simulatePaste(
        '<p>Normal <strong>bold</strong> text</p>',
        'Normal bold text'
      )

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror strong').should('exist').and('contain.text', 'bold')
      cy.get('.ProseMirror p').should('contain.text', 'Normal bold text')
    })

    it('preserves list when entire list is pasted back in place', () => {
      mountEditor('<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      simulatePaste(
        '<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>',
        'Alpha\nBeta\nGamma'
      )

      cy.get('.ProseMirror ul').should('exist')
      // TipTap may add a trailing empty <li> on paste — check content, not exact count
      cy.get('.ProseMirror li').should('have.length.gte', 3)
      cy.get('.ProseMirror').should('contain.text', 'Alpha')
      cy.get('.ProseMirror').should('contain.text', 'Beta')
      cy.get('.ProseMirror').should('contain.text', 'Gamma')
    })

    it('preserves heading level when heading is pasted back in place', () => {
      mountEditor('<h2>Section Title</h2>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      simulatePaste('<h2>Section Title</h2>', 'Section Title')

      cy.get('.ProseMirror h2').should('exist').and('contain.text', 'Section Title')
    })
  })

  /**
   * ProseMirror clipboard bypass:
   * When clipboard HTML contains data-pm-slice, handlePaste should return false
   * and let ProseMirror handle the paste natively. This avoids extra empty
   * paragraphs that insertContent creates for multi-paragraph block content.
   */
  describe('ProseMirror clipboard bypass – no extra empty paragraphs', () => {
    it('does not add empty paragraphs when pasting two paragraphs back in place', () => {
      mountEditor('<p>Line one</p><p>Line two</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      // Simulate ProseMirror clipboard (data-pm-slice triggers native handling)
      simulatePaste(
        '<meta charset="utf-8"><p data-pm-slice="1 1 []">Line one</p><p>Line two</p>',
        'Line one\n\nLine two'
      )

      cy.get('.ProseMirror').find('p').should('have.length', 2)
      cy.get('.ProseMirror p').first().should('contain.text', 'Line one')
      cy.get('.ProseMirror p').last().should('contain.text', 'Line two')
    })

    it('does not add empty paragraphs when pasting three paragraphs back in place', () => {
      mountEditor('<p>First</p><p>Second</p><p>Third</p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      simulatePaste(
        '<meta charset="utf-8"><p data-pm-slice="1 1 []">First</p><p>Second</p><p>Third</p>',
        'First\n\nSecond\n\nThird'
      )

      cy.get('.ProseMirror').find('p').should('have.length', 3)
      cy.get('.ProseMirror').should('contain.text', 'First')
      cy.get('.ProseMirror').should('contain.text', 'Second')
      cy.get('.ProseMirror').should('contain.text', 'Third')
    })

    it('preserves formatting when pasting ProseMirror clipboard with bold/italic', () => {
      mountEditor('<p>Normal <strong>bold</strong> and <em>italic</em></p>')

      cy.get('[data-cy="editor-content"]').click()
      cy.get('.ProseMirror').type('{selectall}')

      simulatePaste(
        '<meta charset="utf-8"><p data-pm-slice="1 1 []">Normal <strong>bold</strong> and <em>italic</em></p>',
        'Normal bold and italic'
      )

      cy.get('.ProseMirror').find('p').should('have.length', 1)
      cy.get('.ProseMirror strong').should('exist').and('contain.text', 'bold')
      cy.get('.ProseMirror em').should('exist').and('contain.text', 'italic')
    })
  })
})
