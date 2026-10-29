import React from 'react'
import '../../../app/globals.css'
import RichTextEditor, { type RichTextEditorHandle } from '@ui/web/components/RichTextEditor'
import { NoteView } from '@ui/web/components/features/notes/NoteView'

const formattedContent = '<p><span style="color: #112233"><strong>Outer color</strong></span></p>' +
  '<p><strong><span style="color: #112233">Inner color</span></strong></p>' +
  '<p><strong>Default bold</strong></p>' +
  '<h2><strong>Heading bold</strong></h2>' +
  '<p><a href="https://example.com"><strong>Link bold</strong></a></p>' +
  '<blockquote><p><strong>Quote bold</strong></p></blockquote>' +
  '<p><b>Legacy bold</b></p>'

describe('Reading and editing text color', { retries: 0 }, () => {
  function checkColors(root: string, dark: boolean) {
    cy.get(root).contains('strong', 'Outer color').then(($strong) => {
      const strong = $strong[0]
      expect(strong.ownerDocument.defaultView!.getComputedStyle(strong).color).to.equal('rgb(17, 34, 51)')
    })
    cy.get(root).contains('strong', 'Inner color').should(($strong) => {
      const strong = $strong[0]
      const paintedText = strong.querySelector('span') ?? strong
      expect(strong.ownerDocument.defaultView!.getComputedStyle(paintedText).color).to.equal('rgb(17, 34, 51)')
    })
    cy.get(root).contains('strong', 'Default bold').then(($strong) => {
      const strong = $strong[0]
      const win = strong.ownerDocument.defaultView!
      const ownColor = win.getComputedStyle(strong).color
      expect(ownColor, 'ordinary bold inherits the paragraph foreground').to.equal(win.getComputedStyle(strong.parentElement!).color)
      expect(Number.parseInt(win.getComputedStyle(strong).fontWeight, 10), 'bold weight').to.be.at.least(700)
      const ctx = strong.ownerDocument.createElement('canvas').getContext('2d')!
      ctx.fillStyle = ownColor
      ctx.fillRect(0, 0, 1, 1)
      const pixel = ctx.getImageData(0, 0, 1, 1).data
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3
      if (dark) expect(brightness).to.be.greaterThan(180)
      else expect(brightness).to.be.lessThan(100)
    })
    cy.get(root).contains('strong', 'Heading bold').then(($strong) => {
      const strong = $strong[0]
      const win = strong.ownerDocument.defaultView!
      expect(win.getComputedStyle(strong).color).to.equal(win.getComputedStyle(strong.parentElement!).color)
    })
    cy.get(root).contains('strong', 'Link bold').then(($strong) => {
      const strong = $strong[0]
      const link = strong.closest('a')!
      const win = strong.ownerDocument.defaultView!
      expect(win.getComputedStyle(strong).color).to.equal(win.getComputedStyle(link).color)
    })
    cy.get(root).contains('strong', 'Quote bold').then(($strong) => {
      const strong = $strong[0]
      const win = strong.ownerDocument.defaultView!
      expect(win.getComputedStyle(strong).color).to.equal(win.getComputedStyle(strong.parentElement!).color)
    })
    cy.get(root).contains('strong, b', 'Legacy bold').then(($bold) => {
      const bold = $bold[0]
      const win = bold.ownerDocument.defaultView!
      expect(win.getComputedStyle(bold).color).to.equal(win.getComputedStyle(bold.parentElement!).color)
    })
  }

  function checkEditingReadingAndReload(dark: boolean) {
    const editorRef = React.createRef<RichTextEditorHandle>()
    let saved = ''
    cy.viewport(1400, 900)
    cy.mount(<div className={dark ? 'dark' : 'light'}><RichTextEditor ref={editorRef} initialContent={formattedContent} /></div>)
    cy.get('.tiptap').should('contain.text', 'Default bold')
    checkColors('.tiptap', dark)
    cy.then(() => {
      saved = editorRef.current!.getContentForSave()
      expect(saved).to.contain('color:')
    })
    cy.then(() => cy.mount(<div className={dark ? 'dark' : 'light'}>
      <NoteView note={{ id: 'note-1', user_id: 'synthetic-user', title: 'Colors', description: saved, tags: [], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }}
        onEdit={() => {}} onDelete={() => {}} onTagClick={() => {}} onRemoveTag={() => {}} />
    </div>))
    cy.get('.note-content').should('contain.text', 'Default bold')
    cy.get('.note-content p').eq(0).find('span > strong').should('exist')
    cy.get('.note-content p').eq(1).find('strong > span').should('exist')
    checkColors('.note-content', dark)
    cy.then(() => cy.mount(<div className={dark ? 'dark' : 'light'}><RichTextEditor initialContent={saved} /></div>))
    cy.get('.tiptap').should('contain.text', 'Default bold')
    checkColors('.tiptap', dark)
  }

  it('keeps explicit and default bold colors through editing, reading and reload in light theme', () => checkEditingReadingAndReload(false))
  it('keeps explicit and default bold colors through editing, reading and reload in dark theme', () => checkEditingReadingAndReload(true))
})
