import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('opens color picker popover when clicking color button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="color-button"]').click()
    cy.get('.twitter-picker').should('be.visible')
  })

  it('applies text color using color picker', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Colored text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.wrap(onContentChangeSpy).invoke('resetHistory')
    cy.get('[data-cy="color-button"]').click()
    cy.get('.twitter-picker').should('be.visible')
    cy.get('.twitter-picker div[title]').first().click()

    cy.get('[data-cy="editor-content"]').find('[style*="color:"]').should('exist')
    cy.get('@onContentChangeSpy').should('have.been.called')
  })

  it('renders font family and size selectors', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="font-family-button"]').should('exist')
    cy.get('[data-cy="font-size-button"]').should('exist')
  })

  it('opens image URL prompt when clicking image button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com/image.jpg')
    })

    cy.get('[data-cy="image-button"]').click()
    cy.window().its('prompt').should('have.been.called')
  })

  it('inserts image when URL is provided', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com/test.jpg')
    })

    cy.get('[data-cy="image-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('img').should('exist')
    cy.get('[data-cy="editor-content"]').find('img').should('have.attr', 'src', 'https://example.com/test.jpg')
  })

  it('does not insert image when prompt is cancelled', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent="<p>Initial content</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    cy.wrap(onContentChangeSpy).invoke('resetHistory')

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(null)
    })

    cy.get('[data-cy="image-button"]').click()
    cy.get('@onContentChangeSpy').should('not.have.been.called')
  })

  it('opens link URL prompt when clicking link button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Link text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com')
    })

    cy.get('[data-cy="link-button"]').click()
    cy.window().its('prompt').should('have.been.called')
  })

  it('creates link when URL is provided', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Click here')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com')
    })

    cy.get('[data-cy="link-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('a').should('exist')
    cy.get('[data-cy="editor-content"]').find('a').should('have.attr', 'href', 'https://example.com')
  })

  it('renders indent and outdent buttons', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="indent-button"]').should('be.visible')
    cy.get('[data-cy="outdent-button"]').should('be.visible')
  })

  it('handles empty content gracefully', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').invoke('text').then((text) => {
      expect(text.replace(/[\u200B-\u200D\uFEFF\s]/g, '')).to.eq('')
    })
  })

  it('handles very long content', () => {
    const longContent = '<p>' + 'A'.repeat(10000) + '</p>'
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent={longContent}
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', 'A')
  })

  it('handles complex nested HTML content', () => {
    const complexContent = '<p><strong>Bold <em>and italic</em></strong> with <mark>highlight</mark> and <u>underline</u></p>'
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent={complexContent}
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', 'Bold')
    cy.get('[data-cy="editor-content"]').should('contain', 'and italic')
  })

  it('handles rapid consecutive formatting changes', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Format test')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()
    cy.get('[data-cy="italic-button"]').click()
    cy.get('[data-cy="underline-button"]').click()

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    cy.get('[data-cy="editor-content"]').find('em').should('exist')
    cy.get('[data-cy="editor-content"]').find('u').should('exist')
  })

  it('renders clear formatting button', () => {
    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={cy.stub()}
      />
    )

    cy.get('[data-cy="clear-formatting-button"]').should('be.visible')
  })

  it('clears text marks (bold, italic, underline) when clicking clear formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Formatted text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()
    cy.get('[data-cy="italic-button"]').click()
    cy.get('[data-cy="underline-button"]').click()

    cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    cy.get('[data-cy="editor-content"]').find('em').should('exist')
    cy.get('[data-cy="editor-content"]').find('u').should('exist')

    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="clear-formatting-button"]').click()

    cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('em').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('u').should('not.exist')
    cy.get('[data-cy="editor-content"]').should('contain', 'Formatted text')
  })

  it('clears highlight and strikethrough when clicking clear formatting', () => {
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
    cy.get('[data-cy="strike-button"]').click()

    cy.get('[data-cy="editor-content"]').find('mark').should('exist')
    cy.get('[data-cy="editor-content"]').find('s').should('exist')

    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="clear-formatting-button"]').click()

    cy.get('[data-cy="editor-content"]').find('mark').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('s').should('not.exist')
    cy.get('[data-cy="editor-content"]').should('contain', 'Highlighted text')
  })
})
