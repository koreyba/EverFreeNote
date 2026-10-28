import React from 'react'
import '../../../app/globals.css'
import RichTextEditor from '@ui/web/components/RichTextEditor'
import { toast } from 'sonner'

const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='

describe('Insert an image from a device', { retries: 0 }, () => {
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
})
