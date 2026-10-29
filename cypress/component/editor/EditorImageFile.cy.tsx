import React from 'react'
import '../../../app/globals.css'
import RichTextEditor, { type RichTextEditorHandle } from '@ui/web/components/RichTextEditor'
import { toast } from 'sonner'

const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='

describe('Insert an image from a device', { retries: 0 }, () => {
  it('returns keyboard focus to the image control when the menu is dismissed', () => {
    cy.mount(<RichTextEditor initialContent="<p>Photo:</p>" />)
    cy.get('[data-cy="image-button"]').focus().click()
    cy.contains('button', 'Choose from device').should('be.visible')
    cy.get('body').type('{esc}')
    cy.get('[data-cy="image-button"]').should('have.focus')
  })

  it('inserts a selected file into the note and reports the edit', () => {
    const onChange = cy.spy().as('onChange')
    cy.viewport(390, 844)
    cy.mount(<RichTextEditor initialContent="<p>Photo:</p>" onContentChange={onChange} />)
    cy.window().then(win => cy.stub(win, 'prompt').returns(null))
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Choose from device').should('be.visible')
    cy.get('[data-cy="image-file-input"]').then($input => {
      cy.stub($input[0], 'click').as('openFilePicker')
    })
    cy.contains('button', 'Choose from device').click()
    cy.get('@openFilePicker').should('have.been.calledOnce')
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from(tinyPng, 'base64'), fileName: 'photo.png', mimeType: 'image/png',
    }, { force: true })
    cy.get('[data-cy="editor-content"] img').should('have.attr', 'src').and('match', /^data:image\/png;base64,/)
    cy.get('@onChange').should('have.been.called')
    cy.get('[data-cy="image-button"]').click()
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from(tinyPng, 'base64'), fileName: 'photo.png', mimeType: 'image/png',
    }, { force: true })
    cy.get('[data-cy="editor-content"] img').should('have.length', 2)
  })

  it('rejects unsupported files without changing the note', () => {
    cy.stub(toast, 'error').as('imageError')
    cy.mount(<RichTextEditor initialContent="<p>Keep this text</p>" />)
    cy.get('[data-cy="image-button"]').click()
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('<svg></svg>'), fileName: 'drawing.svg', mimeType: 'image/svg+xml',
    }, { force: true })
    cy.get('@imageError').should('have.been.calledWith', 'Unsupported image type')
    cy.get('[data-cy="editor-content"] img').should('not.exist')
    cy.get('[data-cy="editor-content"]').should('contain.text', 'Keep this text')
  })

  it('does not insert a corrupt image file', () => {
    cy.stub(toast, 'error').as('imageError')
    cy.mount(<RichTextEditor initialContent="<p>Keep this text</p>" />)
    cy.get('[data-cy="image-button"]').click()
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('not a PNG'), fileName: 'broken.png', mimeType: 'image/png',
    }, { force: true })
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.get('[data-cy="editor-content"] img').should('not.exist')
  })

  it('rejects images larger than 10 MB', () => {
    cy.stub(toast, 'error').as('imageError')
    cy.mount(<RichTextEditor initialContent="<p>Keep this text</p>" />)
    cy.get('[data-cy="image-button"]').click()
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.alloc(10 * 1024 * 1024 + 1), fileName: 'large.png', mimeType: 'image/png',
    }, { force: true })
    cy.get('@imageError').should('have.been.calledWith', 'Image is too large')
    cy.get('[data-cy="editor-content"] img').should('not.exist')
  })

  it('finishes the pending operation and reports a file read error', () => {
    const editor = React.createRef<RichTextEditorHandle>()
    cy.stub(toast, 'error').as('imageError')
    cy.mount(<RichTextEditor ref={editor} initialContent="<p>Photo:</p>" />)
    let failRead: (() => void) | undefined
    let readResult: Promise<boolean> | undefined
    cy.window().then(win => {
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader) {
        failRead = () => { this.dispatchEvent(new win.ProgressEvent('error')) }
      })
    })
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from(tinyPng, 'base64'), fileName: 'photo.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(failRead).to.be.a('function'))
    cy.then(() => {
      expect(editor.current?.hasPendingImageOperations?.()).to.equal(true)
      readResult = editor.current!.waitForPendingImageOperations!().then(() => false, () => true)
      failRead!()
    })
    cy.then(async () => expect(await readResult).to.equal(true))
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.then(() => expect(editor.current?.hasPendingImageOperations?.()).to.equal(false))
  })

  it('cancels and releases a pending image read on unmount', () => {
    const editor = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={editor} initialContent="<p>Photo:</p>" />)
    const readers: FileReader[] = []
    let abort: sinon.SinonStub | undefined
    let completed: Promise<void> | undefined
    cy.window().then(win => {
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader) {
        readers.push(this)
        Object.defineProperty(this, 'readyState', { configurable: true, value: win.FileReader.LOADING })
        abort = Cypress.sinon.stub(this, 'abort')
      })
    })
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from(tinyPng, 'base64'), fileName: 'photo.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(readers).to.have.length(1))
    cy.then(() => { completed = editor.current!.waitForPendingImageOperations!() })
    cy.mount(<></>)
    cy.then(async () => {
      await completed
      expect(abort?.calledOnce).to.equal(true)
      expect(readers[0].onload).to.equal(null)
      expect(readers[0].onerror).to.equal(null)
      expect(readers[0].onabort).to.equal(null)
    })
  })
})
