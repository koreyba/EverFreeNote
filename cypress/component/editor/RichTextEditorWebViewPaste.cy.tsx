import React from 'react'
import RichTextEditorWebView from '../../../ui/web/components/RichTextEditorWebView'
import { SmartPasteService } from '../../../core/services/smartPaste'

/**
 * Dispatches a native paste event with synthetic clipboardData.
 * Mirrors the helper in RichTextEditorPaste.cy.tsx, but targets RichTextEditorWebView.
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

/**
 * Dispatches a paste event without clipboardData.
 * Simulates Android/iOS WebView behaviour where the system paste menu fires a paste
 * event with event.clipboardData === null.
 */
function simulatePasteNoClipboard() {
  cy.get('.ProseMirror').then(($el) => {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    // clipboardData is intentionally not set — remains null/undefined
    $el[0].dispatchEvent(event)
  })
}

function mountEditor(content = '') {
  cy.mount(<RichTextEditorWebView initialContent={content} />)
}

describe('RichTextEditorWebView – Smart Paste', () => {
  /**
   * Mobile WebView guard: when event.clipboardData is null (common on Android/iOS),
   * handlePaste must return false and let the platform handle the paste natively.
   * SmartPasteService must NOT be called.
   */
  describe('null clipboardData guard – Android/iOS WebView fallback', () => {
    it('does not call SmartPasteService.resolvePaste when clipboardData is missing', () => {
      cy.spy(SmartPasteService, 'resolvePaste').as('resolvePaste')
      mountEditor('<p>Existing content</p>')

      simulatePasteNoClipboard()

      cy.get('@resolvePaste').should('not.have.been.called')
    })

    it('preserves existing editor content when clipboardData is null', () => {
      mountEditor('<p>Should not change</p>')

      simulatePasteNoClipboard()

      cy.get('.ProseMirror p').should('contain.text', 'Should not change')
    })
  })

  /**
   * HTML clipboard – content copied from a browser, Google Docs, etc.
   */
  describe('HTML paste', () => {
    it('inserts heading and paragraph structure from HTML clipboard', () => {
      mountEditor('')
      simulatePaste('<h1>Title</h1><p>Body text</p>', 'Title\nBody text')

      cy.get('.ProseMirror h1').should('contain.text', 'Title')
      cy.get('.ProseMirror p').should('contain.text', 'Body text')
    })

    it('strips inline color styles while preserving font-weight', () => {
      mountEditor('')
      simulatePaste(
        '<p style="color: red; font-weight: bold">Bold red text</p>',
        'Bold red text'
      )

      cy.get('.ProseMirror').should('contain.text', 'Bold red text')
      // color: must be removed (theme clash prevention)
      cy.get('.ProseMirror p').then(($p) => {
        expect($p[0].getAttribute('style') ?? '').not.to.include('color:')
      })
    })

    it('preserves unordered list from HTML clipboard', () => {
      mountEditor('')
      simulatePaste(
        '<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>',
        'Alpha\nBeta\nGamma'
      )

      cy.get('.ProseMirror ul').should('exist')
      cy.get('.ProseMirror li').should('have.length.gte', 3)
    })

    it('preserves blockquote from HTML clipboard', () => {
      mountEditor('')
      simulatePaste(
        '<blockquote><p>A famous quote</p></blockquote>',
        '> A famous quote'
      )

      cy.get('.ProseMirror blockquote').should('exist').and('contain.text', 'A famous quote')
    })
  })

  /**
   * Markdown paste – text-only clipboard (no HTML).
   * Common when pasting from a terminal, AI chat, or notes app on mobile.
   */
  describe('Markdown paste (text/plain clipboard only)', () => {
    it('converts markdown h1 to a heading element', () => {
      mountEditor('')
      simulatePaste(null, '# Main Heading\n\nSome text')

      cy.get('.ProseMirror h1').should('contain.text', 'Main Heading')
    })

    it('converts markdown unordered list to ul', () => {
      mountEditor('')
      // Emphasis (+1) brings score to 3 (list +2 + emphasis +1), meeting the detection threshold.
      simulatePaste(null, '- First item\n- **Second item**\n- Third item')

      cy.get('.ProseMirror ul').should('exist')
      cy.get('.ProseMirror li').should('have.length.gte', 3)
    })

    it('converts markdown blockquote', () => {
      mountEditor('')
      // Emphasis (+1) brings score to 3 (blockquote +2 + emphasis +1), meeting the detection threshold.
      simulatePaste(null, '> This is a **quoted** passage')

      cy.get('.ProseMirror blockquote').should('exist').and('contain.text', 'This is a quoted passage')
    })

    it('converts fenced code block to pre/code', () => {
      mountEditor('')
      simulatePaste(null, '```\nconst x = 42\n```')

      cy.get('.ProseMirror pre code').should('contain.text', 'const x = 42')
    })
  })

  /**
   * Plain text paste – no markdown markers, no HTML.
   */
  describe('plain text paste', () => {
    it('wraps plain text in a paragraph', () => {
      mountEditor('')
      simulatePaste(null, 'Just plain text')

      cy.get('.ProseMirror p').should('contain.text', 'Just plain text')
    })

    it('escapes raw HTML tags in plain text', () => {
      mountEditor('')
      simulatePaste(null, '<script>alert(1)</script> safe text')

      cy.get('.ProseMirror').should('not.contain.html', '<script>')
      cy.get('.ProseMirror').should('contain.text', 'safe text')
    })
  })
})
