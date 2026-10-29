import React from 'react'
import '../../../app/globals.css'
import RichTextEditor, { type RichTextEditorHandle } from '../../../ui/web/components/RichTextEditor'
import { NoteView } from '../../../ui/web/components/features/notes/NoteView'
import { SplitNotePreview } from '../../../ui/web/components/features/notes/SplitNotePreview'
import { PublicNotePage } from '../../../ui/web/components/features/public/PublicNotePage'

const sizes = [
  { name: 'Square large', sourceWidth: 192, sourceHeight: 192, height: 800 },
  { name: 'Wide large', sourceWidth: 192, sourceHeight: 96, height: 800 },
  { name: 'Tall large', sourceWidth: 96, sourceHeight: 192, height: 800 },
  { name: 'Square small', sourceWidth: 192, sourceHeight: 192, height: 48 },
  { name: 'Wide small', sourceWidth: 192, sourceHeight: 96, height: 48 },
  { name: 'Tall small', sourceWidth: 96, sourceHeight: 192, height: 48 },
]

describe('Height-only note images', { retries: 0 }, () => {
  for (const viewportWidth of [320, 390, 1200]) {
    it(`preserves intrinsic proportions and requested sizes in both modes at ${viewportWidth}px`, () => {
      cy.viewport(viewportWidth, 900)
      cy.window().then((win) => {
        const source = (width: number, height: number) => {
          const canvas = win.document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')!
          context.fillStyle = '#e1f0e5'
          context.fillRect(0, 0, width, height)
          context.fillStyle = '#34764b'
          context.fillRect(0, height * 0.7, width, height * 0.3)
          context.beginPath()
          context.arc(width * 0.5, height * 0.4, Math.min(width, height) * 0.16, 0, Math.PI * 2)
          context.fill()
          return canvas.toDataURL('image/png')
        }
        const content = '<p>Before</p>' + sizes.map(({ name, sourceWidth, sourceHeight, height }) =>
          `<p><img src="${source(sourceWidth, sourceHeight)}" height="${height}" alt="${name}"></p>`
        ).join('') + '<p>After</p>'
        const note = { id: 'height-only', user_id: 'synthetic', title: 'Image sizing', description: content, tags: [], created_at: '2026-01-01', updated_at: '2026-01-01' }
        const changed = cy.stub().as('changed')
        const ref = React.createRef<RichTextEditorHandle>()

        const inspect = () => {
          for (const { name, sourceWidth, sourceHeight, height } of sizes) {
            cy.get(`img[alt="${name}"]`).should(($image) => {
              const image = $image[0] as HTMLImageElement
              expect(image.naturalWidth).to.equal(sourceWidth)
              expect(image.naturalHeight).to.equal(sourceHeight)
              const box = image.getBoundingClientRect()
              const available = image.parentElement!.getBoundingClientRect().width
              const expectedWidth = Math.min(height * sourceWidth / sourceHeight, available)
              expect(box.width, name + ' width').to.be.closeTo(expectedWidth, 1)
              expect(box.height, name + ' height').to.be.closeTo(expectedWidth * sourceHeight / sourceWidth, 1)
            })
          }
        }

        cy.mount(<div style={{ display: 'flex', height: 900, width: '100%' }}><NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
        inspect()
        cy.get('img[alt="Square large"]').scrollIntoView()
        cy.screenshot(`height-only-read-${viewportWidth}`)
        cy.mount(<div style={{ width: '100%', padding: '20px' }}><RichTextEditor ref={ref} initialContent={content} onContentChange={changed} /></div>)
        inspect()
        cy.get('img[alt="Square large"]').scrollIntoView()
        cy.screenshot(`height-only-edit-${viewportWidth}`)
        cy.get('@changed').should('not.have.been.called')
        cy.then(() => {
          const html = ref.current?.getHTML() ?? ''
          expect(html).not.to.contain('style=')
          const document = new DOMParser().parseFromString(html, 'text/html')
          expect(document.querySelectorAll('img')).to.have.length(sizes.length)
          for (const { name, height } of sizes) {
            const image = document.querySelector(`img[alt="${name}"]`)
            expect(image?.getAttribute('height')).to.equal(String(height))
            expect(image?.hasAttribute('width')).to.equal(false)
          }
        })
        cy.get('[contenteditable="true"]').should('have.attr', 'role', 'textbox').and('have.attr', 'aria-label', 'Note content').and('have.attr', 'aria-multiline', 'true').focus().type('{end} keyboard', { force: true }).should('contain.text', ' keyboard')
      })
    })
  }

  it('resizes a delayed image after load without changing the note or creating a fixed-height placeholder', () => {
    cy.viewport(320, 720)
    cy.intercept('GET', '/__qa/slow.png', {
      statusCode: 200, body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="green"/></svg>', delay: 600,
      headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
    }).as('slowImage')
    const content = '<p><img src="/__qa/slow.png" height="800"></p>'
    const note = { id: 'delayed', user_id: 'synthetic', title: 'Slow image', description: content, tags: [], created_at: '2026-01-01', updated_at: '2026-01-01' }
    const checkBeforeLoad = () => cy.get('img[alt="Image without description"]').should(($image) => {
      const image = $image[0] as HTMLImageElement
      expect(image.complete).to.equal(false)
      expect(image.style.height).to.equal('')
      expect(image.style.width).to.equal('')
    })
    const checkAfterLoad = () => cy.get('img[alt="Image without description"]').should(($image) => {
      const image = $image[0] as HTMLImageElement
      const box = image.getBoundingClientRect()
      expect(image.naturalWidth).to.equal(1)
      expect(box.width).to.be.closeTo(image.parentElement!.getBoundingClientRect().width, 1)
      expect(box.height).to.be.closeTo(box.width, 1)
    })
    cy.mount(<div style={{ display: 'flex', height: 720, width: '100%' }}><NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
    checkBeforeLoad()
    cy.wait('@slowImage')
    checkAfterLoad()
    const ref = React.createRef<RichTextEditorHandle>()
    const changed = cy.stub().as('delayedChanged')
    cy.mount(<div style={{ width: '100%', padding: 20 }}><RichTextEditor ref={ref} initialContent={content} onContentChange={changed} /></div>)
    checkBeforeLoad()
    cy.wait('@slowImage')
    checkAfterLoad()
    cy.get('@delayedChanged').should('not.have.been.called')
    cy.then(() => {
      const html = ref.current?.getHTML() ?? ''
      expect(html).to.contain('height="800"')
      expect(html).not.to.contain('style=')
      expect(html).not.to.contain('Image without description')
    })
  })

  it('uses the same sizing in shared notes and the inactive split pane', () => {
    cy.viewport(390, 844)
    const content = '<p><img src="/icons/icon-192.png" height="800" alt="Shared image"></p>'
    const note = { id: 'shared', user_id: 'synthetic', title: 'Shared', description: content, tags: [], created_at: '2026-01-01', updated_at: '2026-01-01' }
    const assertSize = () => cy.get('img[alt="Shared image"]').should(($image) => {
      const image = $image[0] as HTMLImageElement
      const box = image.getBoundingClientRect()
      expect(image.naturalWidth).to.equal(192)
      expect(box.width).to.be.closeTo(image.parentElement!.getBoundingClientRect().width, 1)
      expect(box.height).to.be.closeTo(box.width, 1)
    })
    cy.mount(<PublicNotePage note={{ ...note, token: 'synthetic' }} />)
    assertSize()
    cy.mount(<div style={{ display: 'flex', height: 844, width: '100%' }}><SplitNotePreview tab={{
      id: 'tab', noteId: note.id, note, mode: 'reading', draft: { title: note.title, description: content, tags: '' },
      view: { scrollTop: 0 }, saveState: 'saved', saveError: null,
    }} onViewSessionChange={cy.stub()} onViewScrollCapture={cy.stub()} /></div>)
    assertSize()
  })
})
