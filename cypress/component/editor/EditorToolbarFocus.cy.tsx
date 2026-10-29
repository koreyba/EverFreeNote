import React from 'react'
import '../../../app/globals.css'
import RichTextEditor from '@ui/web/components/RichTextEditor'

describe('Desktop toolbar focus', { retries: 0 }, () => {
  function mountEditor(initialContent = '<p>Ordinary note</p>') {
    cy.viewport(1400, 900)
    cy.mount(<RichTextEditor initialContent={initialContent} />)
    cy.get('.tiptap').should('contain.text', 'Ordinary note').focus()
    cy.get('.tiptap p').first().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const selection = doc.getSelection()!
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      selection.removeAllRanges()
      selection.addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
  }

  function selectWhileHoldingFrames(selector: string, frames: FrameRequestCallback[]) {
    cy.get(selector).focus().should('be.focused').then(($button) => {
      const button = $button[0] as HTMLElement
      const win = button.ownerDocument.defaultView!
      const original = win.requestAnimationFrame
      win.requestAnimationFrame = callback => {
        frames.push(callback)
        return original.call(win, () => {})
      }
      try { button.click() } finally { win.requestAnimationFrame = original }
      expect(frames.length, 'the command queued a focus frame').to.be.greaterThan(0)
    })
  }

  function checkColorPickerKeepsFocus(frames: FrameRequestCallback[]) {
    cy.get('[data-cy="color-button"]').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="dialog"]').length).to.equal(1))
    cy.window().then(win => frames.forEach(callback => callback(win.performance.now())))
    cy.get('[role="dialog"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="dialog"]').length).to.equal(1))
  }

  function selectOptionWhileHoldingFrames(selector: string, text: string | null, frames: FrameRequestCallback[]) {
    const target = text ? cy.contains(selector, text) : cy.get(selector).first()
    target.scrollIntoView().should('be.visible').then(($item) => {
      const item = $item[0] as HTMLElement
      const win = item.ownerDocument.defaultView!
      const original = win.requestAnimationFrame
      win.requestAnimationFrame = callback => { frames.push(callback); return original.call(win, () => {}) }
      try { item.click() } finally { win.requestAnimationFrame = original }
      expect(frames.length, 'the command queued a focus frame').to.be.greaterThan(0)
    })
  }

  it('keeps the color picker focused after delayed Bold', () => {
    mountEditor()
    const frames: FrameRequestCallback[] = []
    selectWhileHoldingFrames('[data-cy="bold-button"]', frames)
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the color picker focused after delayed Italic', () => {
    mountEditor()
    const frames: FrameRequestCallback[] = []
    selectWhileHoldingFrames('[data-cy="italic-button"]', frames)
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the color picker focused after a delayed bullet list command', () => {
    mountEditor()
    const frames: FrameRequestCallback[] = []
    selectWhileHoldingFrames('[data-cy="bullet-list-button"]', frames)
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the color picker focused after a delayed alignment command', () => {
    mountEditor()
    const frames: FrameRequestCallback[] = []
    selectWhileHoldingFrames('[data-cy="align-center-button"]', frames)
    checkColorPickerKeepsFocus(frames)
  })

  for (const [label, selector] of [
    ['heading', 'h1-button'],
    ['highlight', 'highlight-button'],
    ['superscript', 'superscript-button'],
    ['clear formatting', 'clear-formatting-button'],
    ['horizontal rule', 'horizontal-rule-button'],
  ]) {
    it(`keeps the color picker focused after a delayed ${label} command`, () => {
      mountEditor()
      const frames: FrameRequestCallback[] = []
      selectWhileHoldingFrames(`[data-cy="${selector}"]`, frames)
      checkColorPickerKeepsFocus(frames)
    })
  }

  it('keeps the color picker focused after delayed list indentation', () => {
    cy.viewport(1400, 900)
    cy.mount(<RichTextEditor initialContent="<ul><li><p>First</p></li><li><p>Second</p></li></ul>" />)
    cy.get('.tiptap').should('contain.text', 'Second').focus()
    cy.get('.tiptap li p').eq(1).then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      const selection = doc.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[data-cy="indent-button"]').should('not.be.disabled')
    const frames: FrameRequestCallback[] = []
    selectWhileHoldingFrames('[data-cy="indent-button"]', frames)
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the color picker focused after a delayed font-size selection', () => {
    mountEditor()
    cy.get('[data-cy="font-size-button"]').click()
    const frames: FrameRequestCallback[] = []
    selectOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the color picker focused after a delayed font-family selection', () => {
    mountEditor()
    cy.get('[data-cy="font-family-button"]').click()
    const frames: FrameRequestCallback[] = []
    selectOptionWhileHoldingFrames('[role="option"]', 'Monospace', frames)
    cy.get('[role="listbox"]').should('not.exist')
    checkColorPickerKeepsFocus(frames)
  })

  it('keeps the image menu focused after a delayed color swatch selection', () => {
    mountEditor()
    cy.get('[data-cy="color-button"]').click()
    const frames: FrameRequestCallback[] = []
    selectOptionWhileHoldingFrames('.twitter-picker [title]', null, frames)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('[role="dialog"][data-state="open"]', 'Choose from device').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="dialog"][data-state="open"]').length).to.equal(1))
    cy.window().then(win => frames.forEach(callback => callback(win.performance.now())))
    cy.contains('[role="dialog"][data-state="open"]', 'Choose from device').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="dialog"][data-state="open"]').length).to.equal(1))
  })

  it('keeps the font-size menu focused after a delayed color swatch selection', () => {
    mountEditor()
    cy.get('[data-cy="color-button"]').click()
    const frames: FrameRequestCallback[] = []
    selectOptionWhileHoldingFrames('.twitter-picker [title]', null, frames)
    cy.get('[data-cy="font-size-button"]').click()
    cy.get('[role="listbox"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="listbox"]').length).to.equal(1))
    cy.window().then(win => frames.forEach(callback => callback(win.performance.now())))
    cy.get('[role="listbox"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="listbox"]').length).to.equal(1))
  })

  it('restores the selection and types with the chosen font size', () => {
    mountEditor()
    cy.get('[data-cy="font-size-button"]').click()
    cy.contains('[role="option"]', '14 pt').click()
    cy.get('.tiptap').should('be.focused')
    cy.window().should(win => expect(win.getSelection()?.toString()).to.equal('Ordinary note'))
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.attr', 'style').and('contain', 'font-size: 14pt')
  })

  it('restores the selection and types with the chosen font family', () => {
    mountEditor()
    cy.get('[data-cy="font-family-button"]').click()
    cy.contains('[role="option"]', 'Monospace').click()
    cy.get('.tiptap').should('be.focused')
    cy.window().should(win => expect(win.getSelection()?.toString()).to.equal('Ordinary note'))
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.css', 'font-family', 'monospace')
  })

  it('keeps desktop editor focus when Select close autofocus follows the focus frame', () => {
    mountEditor()
    cy.get('[data-cy="font-size-button"]').click()
    const frames: FrameRequestCallback[] = []
    const focusedBeforeClose: boolean[] = []
    cy.get('[role="listbox"][data-state="open"]').should('be.visible').then(($listbox) => {
      const doc = $listbox[0].ownerDocument
      const win = doc.defaultView!
      $listbox[0].addEventListener('focusScope.autoFocusOnUnmount', () => {
        frames.forEach(callback => callback(win.performance.now()))
        focusedBeforeClose.push(doc.activeElement === doc.querySelector('.tiptap'))
      }, { once: true })
    })
    selectOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.wrap(focusedBeforeClose).should('deep.equal', [true])
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.attr', 'style').and('contain', 'font-size: 14pt')
  })

  it('restores desktop editor focus when Select close autofocus precedes the focus frame', () => {
    mountEditor()
    cy.get('[data-cy="font-size-button"]').click()
    const frames: FrameRequestCallback[] = []
    const closeEvents: string[] = []
    cy.get('[role="listbox"][data-state="open"]').should('be.visible').then(($listbox) => {
      $listbox[0].addEventListener('focusScope.autoFocusOnUnmount', () => closeEvents.push('closed'), { once: true })
    })
    selectOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.wrap(closeEvents).should('deep.equal', ['closed'])
    cy.window().then(win => frames.forEach(callback => callback(win.performance.now())))
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.attr', 'style').and('contain', 'font-size: 14pt')
  })

  it('returns to the font-size trigger after Escape without a choice', () => {
    mountEditor()
    cy.get('[data-cy="font-size-button"]').click()
    cy.get('[role="listbox"]').should('be.visible')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-size-button"]').should('be.focused')
  })

  it('returns the selection to the editor and types bold after a keyboard command', () => {
    mountEditor()
    cy.get('[data-cy="bold-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should(($editor) => {
      const editor = $editor[0]
      const doc = editor.ownerDocument
      const active = doc.activeElement as HTMLElement | null
      expect(active, `active=${active?.tagName}:${active?.getAttribute('aria-label')}, documentHasFocus=${doc.hasFocus()}, visibility=${doc.visibilityState}`).to.equal(editor)
    })
    cy.window().should(win => expect(win.getSelection()?.toString()).to.equal('Ordinary note'))
    cy.press('x')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'x')
  })

  it('keeps the stored bold mark when a keyboard command adds italic', () => {
    mountEditor()
    cy.get('[data-cy="bold-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('[data-cy="italic-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.press('y')
    cy.get('.tiptap strong').should('have.text', 'xy')
    cy.get('.tiptap strong em').should('have.text', 'y')
  })

  it('returns to a list item and accepts typed text after a keyboard command', () => {
    mountEditor()
    cy.get('[data-cy="bullet-list-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap ul li p').should('have.text', 'x')
  })

  it('returns to the aligned paragraph and accepts typed text after a keyboard command', () => {
    mountEditor()
    cy.get('[data-cy="align-center-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').first().should('have.text', 'x').and('have.attr', 'style').and('contain', 'text-align: center')
  })

  for (const [label, button, result] of [
    ['heading', 'h1-button', 'h1'],
    ['highlight', 'highlight-button', 'mark'],
    ['superscript', 'superscript-button', 'sup'],
  ]) {
    it(`returns to the editor and types with ${label} after a keyboard command`, () => {
      mountEditor()
      cy.get(`[data-cy="${button}"]`).focus()
      cy.press(Cypress.Keyboard.Keys.SPACE)
      cy.get('.tiptap').should('be.focused')
      cy.window().should(win => expect(win.getSelection()?.toString()).to.equal('Ordinary note'))
      cy.press('x')
      cy.get(`.tiptap ${result}`).should('have.text', 'x')
    })
  }

  it('removes formatting and accepts typed text after a keyboard command', () => {
    mountEditor('<p><strong>Ordinary note</strong></p>')
    cy.get('[data-cy="clear-formatting-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').should('have.text', 'x')
    cy.get('.tiptap strong').should('not.exist')
  })

  it('inserts a horizontal rule and returns focus for typing', () => {
    mountEditor()
    cy.get('[data-cy="horizontal-rule-button"]').focus()
    cy.press(Cypress.Keyboard.Keys.SPACE)
    cy.get('.tiptap').should('be.focused')
    cy.get('.tiptap hr').should('exist')
    cy.press('x')
    cy.get('.tiptap').should('contain.text', 'x')
  })
})
