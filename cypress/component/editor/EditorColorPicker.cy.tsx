import React from 'react'
import '../../../app/globals.css'
import RichTextEditor, { type RichTextEditorHandle } from '@ui/web/components/RichTextEditor'

function EditorFixture({ mobile, dark, editorRef, onChange, initialContent = '<p>Ordinary note</p>' }: {
  mobile: boolean
  dark: boolean
  editorRef: React.RefObject<RichTextEditorHandle | null>
  onChange: () => void
  initialContent?: string
}) {
  const [toolbar, setToolbar] = React.useState<HTMLDivElement | null>(null)
  return <div className={dark ? 'dark' : 'light'}>
    {!mobile && <div aria-hidden="true" style={{ height: 'var(--note-editor-header-h)' }} />}
    <div ref={setToolbar} />
    <RichTextEditor ref={editorRef} initialContent={initialContent} onContentChange={onChange} mobileToolbarContainer={mobile ? toolbar : null} />
    <button data-cy="outside-editor">Outside</button>
  </div>
}

describe('Editor color picker', { retries: 0 }, () => {
  let restoreNavigator = () => {}
  afterEach(() => {
    restoreNavigator()
    restoreNavigator = () => {}
  })

  function emulatePlatform(platform: 'desktop' | 'android' | 'ios') {
    cy.window().then(win => {
      const originalUserAgent = Object.getOwnPropertyDescriptor(win.navigator, 'userAgent')
      const originalPlatform = Object.getOwnPropertyDescriptor(win.navigator, 'platform')
      if (platform === 'android') {
        Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36' })
      } else if (platform === 'ios') {
        Object.defineProperty(win.navigator, 'platform', { configurable: true, value: 'iPhone' })
      }
      restoreNavigator = () => {
        if (originalUserAgent) Object.defineProperty(win.navigator, 'userAgent', originalUserAgent)
        else Reflect.deleteProperty(win.navigator, 'userAgent')
        if (originalPlatform) Object.defineProperty(win.navigator, 'platform', originalPlatform)
        else Reflect.deleteProperty(win.navigator, 'platform')
      }
    })
  }

  function mountEditor(mobile: boolean, dark: boolean, initialContent?: string) {
    cy.viewport(mobile ? 320 : 1400, mobile ? 740 : 900)
    const editorRef = React.createRef<RichTextEditorHandle>()
    const onChange = cy.spy().as('editorChange')
    cy.mount(<EditorFixture mobile={mobile} dark={dark} editorRef={editorRef} onChange={onChange} initialContent={initialContent} />)
    cy.get('.tiptap').should('contain.text', 'Ordinary note').focus()
    cy.get('.tiptap p').first().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      const selection = doc.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    return { editorRef, onChange }
  }

  function openColor() {
    cy.get('[data-cy="color-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.get('.twitter-picker input').should('be.visible')
  }

  function verifyInheritedColor(mobile: boolean, dark: boolean) {
    const { editorRef, onChange } = mountEditor(mobile, dark)
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.contains('[role="option"]', '14 pt').scrollIntoView().click()
    cy.get('.tiptap p span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
    let beforeHtml = ''
    let beforeSelection: { from: number; to: number } | undefined
    let expectedHex = ''
    cy.get('.tiptap p span').then(($span) => {
      const element = $span[0]
      const doc = element.ownerDocument
      const ctx = doc.createElement('canvas').getContext('2d')!
      ctx.fillStyle = doc.defaultView!.getComputedStyle(element).color
      ctx.fillRect(0, 0, 1, 1)
      const rgba = ctx.getImageData(0, 0, 1, 1).data
      const brightness = (rgba[0] + rgba[1] + rgba[2]) / 3
      if (dark) expect(brightness, 'dark theme inherited foreground').to.be.greaterThan(180)
      else expect(brightness, 'light theme inherited foreground').to.be.lessThan(100)
      expectedHex = Array.from(rgba.slice(0, 3), value => value.toString(16).padStart(2, '0')).join('').toUpperCase()
      beforeHtml = editorRef.current!.getHTML()
      beforeSelection = editorRef.current!.getSelection!()
      expect(beforeHtml).not.to.contain('color:')
      onChange.resetHistory()
    })
    openColor()
    cy.get('.twitter-picker input').should(($input) => expect($input.val()).to.equal(expectedHex))
    cy.get('.twitter-picker input').focus()
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="dialog"]').should('not.exist')
    cy.then(() => {
      expect(editorRef.current!.getHTML()).to.equal(beforeHtml)
      expect(editorRef.current!.getSelection!()).to.deep.equal(beforeSelection)
      expect(onChange).not.to.have.been.called
    })
    openColor()
    cy.get('.twitter-picker [title="#FF6900"]').click()
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.css', 'color', 'rgb(255, 105, 0)')
    cy.get('.tiptap p span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
    cy.then(() => {
      expect(onChange).to.have.been.called
      expect(editorRef.current!.getContentForSave()).to.contain('color:')
      expect(editorRef.current!.getContentForSave()).to.contain('14pt')
    })
  }

  it('previews inherited color without modifying the note on mobile light', () => verifyInheritedColor(true, false))
  it('previews inherited color without modifying the note on mobile dark', () => verifyInheritedColor(true, true))
  it('previews inherited color without modifying the note on desktop light', () => verifyInheritedColor(false, false))
  it('previews inherited color without modifying the note on desktop dark', () => verifyInheritedColor(false, true))

  it('previews an explicitly stored text color instead of the inherited foreground', () => {
    mountEditor(true, true, '<p><span style="color: #112233">Ordinary note</span></p>')
    openColor()
    cy.get('.twitter-picker input').should('have.value', '112233')
  })

  it('opens an unformatted note without writing a default color', () => {
    const { editorRef, onChange } = mountEditor(true, false)
    let before = ''
    cy.then(() => { before = editorRef.current!.getHTML(); onChange.resetHistory() })
    openColor()
    cy.then(() => {
      expect(editorRef.current!.getHTML()).to.equal(before)
      expect(onChange).not.to.have.been.called
    })
  })

  function verifyHexInput(mobile: boolean, dark: boolean) {
    const { editorRef, onChange } = mountEditor(mobile, dark, '<p><span style="font-size: 14pt">Ordinary note</span></p>')
    let selection: { from: number; to: number } | undefined
    cy.then(() => { selection = editorRef.current!.getSelection!(); onChange.resetHistory() })
    openColor()
    cy.get('.twitter-picker input').clear().type('aa', { delay: 0 })
    cy.then(() => expect(onChange, 'invalid two-digit hex is not applied').not.to.have.been.called)
    const frames: FrameRequestCallback[] = []
    cy.get('.twitter-picker input').then(($input) => {
      const input = $input[0] as HTMLInputElement
      const win = input.ownerDocument.defaultView!
      const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!
      const original = win.requestAnimationFrame
      win.requestAnimationFrame = callback => { frames.push(callback); return original.call(win, () => {}) }
      try {
        setter.call(input, 'aab')
        input.dispatchEvent(new win.Event('input', { bubbles: true }))
      } finally { win.requestAnimationFrame = original }
    })
    cy.get('.tiptap p span').should('have.css', 'color', 'rgb(170, 170, 187)')
    cy.window().then(win => frames.forEach(callback => callback(win.performance.now())))
    cy.get('.twitter-picker input').should('be.focused').type('bcc', { delay: 0 })
    cy.get('.twitter-picker input').should('have.value', 'aabbcc')
    cy.get('.tiptap p span').should('have.css', 'color', 'rgb(170, 187, 204)')
    cy.then(() => expect(editorRef.current!.getSelection!()).to.deep.equal(selection))
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="dialog"]').should('not.exist')
    // Radix restores the trigger asynchronously after the close animation.
    cy.get('[data-cy="color-button"]').should('be.focused')
    cy.get('.tiptap p span').click({ scrollBehavior: false })
    cy.get('.tiptap').should('be.focused')
    cy.wrap(null).should(() => {
      const caret = editorRef.current!.getSelection!()!
      expect(caret.from).to.equal(caret.to)
      expect(caret.from).to.be.within(1, 'Ordinary note'.length + 1)
    })
    cy.press('x')
    cy.get('.tiptap p span').should($span => {
      expect($span.text().replace('x', '')).to.equal('Ordinary note')
      expect($span.text()).to.have.length('Ordinary note'.length + 1)
    }).and('have.css', 'color', 'rgb(170, 187, 204)')
    cy.get('.tiptap p span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
  }

  it('keeps partially typed HEX input and selection on mobile light', () => verifyHexInput(true, false))
  it('keeps partially typed HEX input and selection on mobile dark', () => verifyHexInput(true, true))
  it('keeps partially typed HEX input and selection on desktop light', () => verifyHexInput(false, false))
  it('keeps partially typed HEX input and selection on desktop dark', () => verifyHexInput(false, true))

  it('keeps stored bold and font size at a collapsed caret while typing a HEX color', () => {
    const { editorRef } = mountEditor(true, false, '<p><strong><span style="font-size: 14pt">Ordinary note</span></strong></p>')
    cy.get('.tiptap p').first().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      range.collapse(false)
      const selection = doc.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.wrap(null).should(() => {
      const caret = editorRef.current!.getSelection!()
      expect(caret).to.deep.equal({ from: 'Ordinary note'.length + 1, to: 'Ordinary note'.length + 1 })
    })
    openColor()
    cy.get('.twitter-picker input').clear().type('112233', { delay: 0 }).should('be.focused')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('[data-cy="color-button"]').should('be.focused')
    cy.get('.tiptap').focus().should('be.focused')
    cy.wrap(null).should(() => {
      const caret = editorRef.current!.getSelection!()
      expect(caret).to.deep.equal({ from: 'Ordinary note'.length + 1, to: 'Ordinary note'.length + 1 })
    })
    cy.press('x')
    cy.then(() => cy.log(`saved HTML: ${editorRef.current!.getHTML()}`))
    cy.get('.tiptap strong').should('have.text', 'Ordinary notex')
    cy.get('.tiptap strong').last().should('have.text', 'x').and('have.css', 'color', 'rgb(17, 34, 51)')
    cy.get('.tiptap strong').last().closest('span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
    cy.then(() => expect(editorRef.current!.getContentForSave()).to.contain('color:'))
  })

  it('keeps the chosen HEX color when focus leaves the picker for another control', () => {
    mountEditor(true, false)
    openColor()
    cy.get('.twitter-picker input').clear().type('112233', { delay: 0 }).should('be.focused')
    cy.get('[data-cy="outside-editor"]').focus().should('be.focused')
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('[data-cy="outside-editor"]').should('be.focused')
    cy.get('.tiptap p span').should('have.css', 'color', 'rgb(17, 34, 51)')
  })

  it('returns to the selected text after choosing a swatch with the keyboard', () => {
    mountEditor(true, false)
    openColor()
    // Cypress/Chrome emits keyCode=0 for cy.press(Enter), while react-color's
    // swatch keyboard handler uses the legacy keyCode 13.
    cy.get('.twitter-picker [title="#FF6900"]').focus().should('be.focused')
      .trigger('keydown', { key: 'Enter', keyCode: 13, which: 13 })
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p span').should('have.text', 'x').and('have.css', 'color', 'rgb(255, 105, 0)')
  })

  for (const platform of ['desktop', 'android', 'ios'] as const) {
    it(`prevents Enter from replacing selected text when choosing a swatch on ${platform}`, () => {
      emulatePlatform(platform)
      const { editorRef } = mountEditor(platform !== 'desktop', false, '<p><span style="font-size: 14pt">Ordinary note</span></p>')
      let beforeSelection: { from: number; to: number } | undefined
      let enterPrevented = false
      cy.then(() => { beforeSelection = editorRef.current!.getSelection!() })
      openColor()
      cy.get('.twitter-picker [title="#FF6900"]').focus().should('be.focused').then(($swatch) => {
        const win = $swatch[0].ownerDocument.defaultView!
        // Cypress cy.press(Enter) emits keyCode 0; react-color uses 13.
        const enter = new win.KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })
        $swatch[0].dispatchEvent(enter)
        enterPrevented = enter.defaultPrevented
      })
      cy.get('.tiptap').should('be.focused')
      cy.get('.tiptap p span').should('have.text', 'Ordinary note').and('have.css', 'color', 'rgb(255, 105, 0)')
      cy.get('.tiptap p span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
      cy.then(() => {
        expect(editorRef.current!.getSelection!()).to.deep.equal(beforeSelection)
        expect(editorRef.current!.getContentForSave()).to.contain('Ordinary note')
        expect(enterPrevented, 'swatch Enter default is cancelled').to.equal(true)
      })
    })
  }

  it('retains a collapsed bold caret when choosing a swatch with Enter', () => {
    emulatePlatform('android')
    const { editorRef } = mountEditor(true, false, '<p><strong><span style="font-size: 14pt">Ordinary note</span></strong></p>')
    cy.get('.tiptap p').then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      range.collapse(false)
      const selection = doc.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.wrap(null).should(() => {
      expect(editorRef.current!.getSelection!()).to.deep.equal({ from: 14, to: 14 })
    })
    openColor()
    let enterPrevented = false
    cy.get('.twitter-picker [title="#FF6900"]').focus().then(($swatch) => {
      const win = $swatch[0].ownerDocument.defaultView!
      const enter = new win.KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })
      $swatch[0].dispatchEvent(enter)
      enterPrevented = enter.defaultPrevented
    })
    cy.get('.tiptap').should('be.focused')
    cy.then(() => {
      expect(enterPrevented, 'swatch Enter default is cancelled').to.equal(true)
      expect(editorRef.current!.getSelection!()).to.deep.equal({ from: 14, to: 14 })
    })
    cy.press('x')
    cy.get('.tiptap strong').should('have.text', 'Ordinary notex')
    cy.get('.tiptap strong').last().should('have.text', 'x').and('have.css', 'color', 'rgb(255, 105, 0)')
    cy.get('.tiptap strong').last().closest('span').should('have.attr', 'style').and('contain', 'font-size: 14pt')
  })

  it('leaves unhandled swatch Space and arrow keys unchanged', () => {
    mountEditor(true, false)
    openColor()
    cy.get('.twitter-picker [title="#FF6900"]').focus().then(($swatch) => {
      const win = $swatch[0].ownerDocument.defaultView!
      for (const [key, keyCode] of [[' ', 32], ['ArrowRight', 39]] as const) {
        const event = new win.KeyboardEvent('keydown', { key, keyCode, which: keyCode, bubbles: true, cancelable: true })
        $swatch[0].dispatchEvent(event)
        expect(event.defaultPrevented, key).to.equal(false)
      }
    })
    cy.get('.twitter-picker [title="#FF6900"]').should('be.focused')
    cy.get('.tiptap p').should('have.text', 'Ordinary note')
    cy.get('.tiptap p span').should('not.exist')
  })

  it('keeps HEX input and editor selection while adjusting the value with an arrow key', () => {
    const { editorRef } = mountEditor(true, false)
    let selection: { from: number; to: number } | undefined
    cy.then(() => { selection = editorRef.current!.getSelection!() })
    openColor()
    cy.get('.twitter-picker input').clear().type('112233', { delay: 0 }).should('be.focused')
      .trigger('keydown', { key: 'ArrowUp', keyCode: 38, which: 38 })
    cy.get('.twitter-picker input').should('be.focused').and('have.value', '112234')
    // react-color changes the input on ArrowUp but does not apply its numeric value as a color.
    cy.get('.tiptap p span').should('have.text', 'Ordinary note').and('have.css', 'color', 'rgb(17, 34, 51)')
    cy.then(() => expect(editorRef.current!.getSelection!()).to.deep.equal(selection))
  })
})
