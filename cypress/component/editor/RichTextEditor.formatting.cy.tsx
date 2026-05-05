import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('applies bold formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('strong').should('contain', 'Hello World')
  })

  it('applies italic formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="italic-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('em').should('contain', 'Hello World')
  })

  it('applies underline formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('u').should('contain', 'Hello World')
  })

  it('applies strikethrough formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="strike-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('s').should('contain', 'Hello World')
  })

  it('applies highlight formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('mark').should('contain', 'Hello World')
  })

  it('renders all basic formatting buttons', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="bold-button"]').should('be.visible')
    cy.get('[data-cy="italic-button"]').should('be.visible')
    cy.get('[data-cy="underline-button"]').should('be.visible')
    cy.get('[data-cy="strike-button"]').should('be.visible')
    cy.get('[data-cy="highlight-button"]').should('be.visible')
  })

  it('creates bullet lists using TipTap TaskList extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bullet-list-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('ul').should('exist')
    cy.get('[data-cy="editor-content"]').find('li').should('exist')
  })

  it('creates ordered lists using TipTap OrderedList extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="ordered-list-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('ol').should('exist')
    cy.get('[data-cy="editor-content"]').find('li').should('exist')
  })

  it('creates task lists using TipTap TaskList extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Task item')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="task-list-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('ul[data-type="taskList"]').should('exist')
    cy.get('[data-cy="editor-content"]').find('li[data-checked]').should('exist')
  })

  it('applies text alignment using TipTap TextAlign extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Centered text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="align-center-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('p').should('have.attr', 'style').and('include', 'text-align: center')
  })

  it('renders superscript and subscript buttons using TipTap extensions', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="superscript-button"]').should('be.visible')
    cy.get('[data-cy="subscript-button"]').should('be.visible')
    cy.get('[data-cy="superscript-button"]').should('not.be.disabled')
    cy.get('[data-cy="subscript-button"]').should('not.be.disabled')
  })

  it('applies underline using TipTap Underline extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Underlined text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('u').should('contain', 'Underlined text')
  })

  it('applies highlight using TipTap Highlight extension', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Highlighted text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('mark').should('contain', 'Highlighted text')
  })
})
