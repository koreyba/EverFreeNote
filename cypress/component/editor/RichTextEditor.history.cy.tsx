import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  describe('Undo/Redo buttons', () => {
    it('renders undo and redo buttons, positioned before bold in toolbar', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="undo-button"]').should('be.visible')
      cy.get('[data-cy="redo-button"]').should('be.visible')

      cy.get('[data-cy="undo-button"]').then(($undo) => {
        cy.get('[data-cy="bold-button"]').then(($bold) => {
          const position = $undo[0].compareDocumentPosition($bold[0])
          expect(position & Node.DOCUMENT_POSITION_FOLLOWING).to.equal(Node.DOCUMENT_POSITION_FOLLOWING)
        })
      })
    })

    it('undo and redo buttons are disabled on empty editor (no history)', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="undo-button"]').should('be.disabled')
      cy.get('[data-cy="redo-button"]').should('be.disabled')
    })

    it('undo button becomes enabled after formatting; redo stays disabled', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()

      cy.get('[data-cy="undo-button"]').should('not.be.disabled')
      cy.get('[data-cy="redo-button"]').should('be.disabled')
    })

    it('clicking undo reverts bold formatting', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')

      cy.get('[data-cy="undo-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')
    })

    it('keyboard undo reverts formatting; keyboard redo restores it', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')

      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')

      cy.get('[data-cy="editor-content"]').type('{ctrl}y')
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    })

    it('redo button restores formatting after keyboard undo', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')

      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')

      cy.get('[data-cy="redo-button"]').should('not.be.disabled')
      cy.get('[data-cy="redo-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    })

    it('redo button becomes disabled after redoing the latest undone step', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="redo-button"]').should('not.be.disabled')

      cy.get('[data-cy="redo-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
      cy.get('[data-cy="redo-button"]').should('be.disabled')
    })

    it('redo button reapplies multiple formatting steps in order', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="italic-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
      cy.get('[data-cy="editor-content"]').find('em').should('exist')

      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')
      cy.get('[data-cy="editor-content"]').find('em').should('not.exist')

      cy.get('[data-cy="redo-button"]').should('not.be.disabled')
      cy.get('[data-cy="redo-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
      cy.get('[data-cy="editor-content"]').find('em').should('not.exist')

      cy.get('[data-cy="redo-button"]').should('not.be.disabled')
      cy.get('[data-cy="redo-button"]').click()
      cy.get('[data-cy="editor-content"]').find('strong').should('exist')
      cy.get('[data-cy="editor-content"]').find('em').should('exist')
    })

    it('undo button has correct tooltip text', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="undo-button"]').should('not.be.disabled')

      cy.get('[data-cy="undo-button"]').focus()
      cy.get('[role="tooltip"]').should('contain', 'Undo (Ctrl+Z)')
    })

    it('redo button has correct tooltip text', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="redo-button"]').should('not.be.disabled')

      cy.get('[data-cy="redo-button"]').focus()
      cy.get('[role="tooltip"]').should('contain', 'Redo (Ctrl+Shift+Z)')
    })
  })
})
