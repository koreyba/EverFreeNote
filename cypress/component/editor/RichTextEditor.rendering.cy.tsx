import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('renders with all toolbar buttons and editor area', () => {
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
    cy.get('[data-cy="color-button"]').should('be.visible')
    cy.get('[data-cy="h1-button"]').should('be.visible')
    cy.get('[data-cy="h2-button"]').should('be.visible')
    cy.get('[data-cy="h3-button"]').should('be.visible')
    cy.get('[data-cy="paragraph-button"]').should('be.visible')
    cy.get('[data-cy="bullet-list-button"]').should('be.visible')
    cy.get('[data-cy="ordered-list-button"]').should('be.visible')
    cy.get('[data-cy="task-list-button"]').should('be.visible')
    cy.get('[data-cy="link-button"]').should('be.visible')
    cy.get('[data-cy="align-left-button"]').should('be.visible')
    cy.get('[data-cy="align-center-button"]').should('be.visible')
    cy.get('[data-cy="align-right-button"]').should('be.visible')
    cy.get('[data-cy="indent-button"]').should('be.visible')
    cy.get('[data-cy="outdent-button"]').should('be.visible')
    cy.get('[data-cy="superscript-button"]').should('be.visible')
    cy.get('[data-cy="subscript-button"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('@onContentChangeSpy').should('not.have.been.called')
  })

  it('renders with initial content', () => {
    const initialContent = '<p>Hello World</p>'
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent={initialContent}
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').should('contain', 'Hello World')
    cy.get('@onContentChangeSpy').should('not.have.been.called')
  })

  it('calls onContentChange when typing in editor', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Test content')

    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').should('contain', 'Test content')
  })

  it('moves caret to end when clicking below the last block (bottom tail)', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent="<p>Hello</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const p = root.querySelector('p') as HTMLElement | null
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const x = Math.floor(rootRect.width / 2) // Click near the horizontal center to avoid side padding edge cases.
      const y = Math.min(Math.floor(rootRect.height - 5), Math.floor(pRect.bottom - rootRect.top + 40)) // Aim below the last paragraph, but stay inside the editor bounds.

      cy.wrap($root).click(x, y, { force: true })
    })
    cy.get('[data-cy="editor-content"]').type('X')

    cy.get('[data-cy="editor-content"]').find('p').first().invoke('text').then((text) => {
      expect(text.trim().endsWith('X')).to.eq(true)
    })
  })

  it('does not jump to document end when clicking an internal vertical gap', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent="<h1>Title</h1><p>AAA</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const h1 = root.querySelector('h1') as HTMLElement | null
      const p = root.querySelector('p') as HTMLElement | null
      expect(h1, 'heading exists').to.exist
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const h1Rect = (h1 as HTMLElement).getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const gapTop = h1Rect.bottom // Lower edge of the heading block.
      const gapBottom = pRect.top // Upper edge of the paragraph block.
      const yClient = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : pRect.top + 2 // Prefer the middle of the internal gap; otherwise fall back just inside the paragraph.

      const x = Math.floor(rootRect.width / 2) // Center click keeps the probe away from left/right padding artifacts.
      const y = Math.max(2, Math.floor(yClient - rootRect.top)) // Convert viewport coords to editor-local coords and keep the click inside the box.

      cy.wrap($root).click(x, y, { force: true })
    })

    cy.get('[data-cy="editor-content"]').type('X')

    cy.get('[data-cy="editor-content"]').find('p').first().invoke('text').then((text) => {
      expect(text.trim().endsWith('X')).to.eq(false)
    })
  })

  it('moves caret to start when clicking above the first block inside editor padding', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent="<h1>Title</h1><p>AAA</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const first = root.querySelector('h1, p, ul, ol') as HTMLElement | null
      expect(first, 'first block exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const firstRect = (first as HTMLElement).getBoundingClientRect()

      const x = 1
      const y = Math.max(1, Math.floor(firstRect.top - rootRect.top - 4))

      cy.wrap($root).click(x, y, { force: true })
    })

    cy.get('[data-cy="editor-content"]').type('X')

    cy.get('[data-cy="editor-content"]').invoke('text').then((text) => {
      expect(text.trim().startsWith('X')).to.eq(true)
    })
  })

  it('does not override caret when clicking to the right of a line inside a paragraph', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent="<p>First</p><p>Second</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const p1 = root.querySelectorAll('p')[0] as HTMLElement | undefined
      expect(p1, 'first paragraph exists').to.exist

      const pRect = (p1 as HTMLElement).getBoundingClientRect()
      const x = Math.max(1, Math.floor(pRect.width - 2))
      const y = Math.max(1, Math.floor(pRect.height / 2))

      cy.wrap(p1 as HTMLElement).click(x, y, { force: true })
    })

    cy.get('[data-cy="editor-content"]').type('X')

    cy.get('[data-cy="editor-content"]').find('p').eq(0).invoke('text').then((text) => {
      expect(text.trim().endsWith('X')).to.eq(true)
    })
    cy.get('[data-cy="editor-content"]').find('p').eq(1).invoke('text').then((text) => {
      expect(text.trim()).to.eq('Second')
    })
  })
})
