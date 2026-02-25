import React from 'react'
import RichTextEditor from '../../../ui/web/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('renders with all toolbar buttons and editor area', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    // Монтируем RichTextEditor с пустым контентом
    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Проверяем что все кнопки тулбара отображаются
    cy.get('[data-cy="bold-button"]').should('be.visible')
    cy.get('[data-cy="italic-button"]').should('be.visible')
    cy.get('[data-cy="underline-button"]').should('be.visible')
    cy.get('[data-cy="strike-button"]').should('be.visible')
    cy.get('[data-cy="highlight-button"]').should('be.visible')

    cy.get('[data-cy="color-button"]').should('be.visible')
    // TODO: Селекты shadcn/ui сложно тестировать в component тестах
    // cy.get('[data-cy="font-family-select"]').should('be.visible')
    // cy.get('[data-cy="font-size-select"]').should('be.visible')

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

    // Проверяем что область редактора отображается
    cy.get('[data-cy="editor-content"]').should('be.visible')

    // Проверяем что onContentChange не вызывался при рендеринге
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

    // Проверяем что контент отображается в редакторе
    cy.get('[data-cy="editor-content"]').should('contain', 'Hello World')

    // Проверяем что onContentChange не вызывался при рендеринге
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

    // Кликаем в область редактора и вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Test content')

    // Проверяем что onContentChange был вызван
    cy.get('@onContentChangeSpy').should('have.been.called')
    // Проверяем что контент отображается
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

    // Click below the last paragraph and type a char.
    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const p = root.querySelector('p') as HTMLElement | null
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const x = Math.floor(rootRect.width / 2)
      const y = Math.min(Math.floor(rootRect.height - 5), Math.floor(pRect.bottom - rootRect.top + 40))

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

    // Click into the gap between heading and paragraph (created by margins), then type.
    // Expected: insertion near the gap (heading end or paragraph start), NOT appended to the last paragraph end.
    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const h1 = root.querySelector('h1') as HTMLElement | null
      const p = root.querySelector('p') as HTMLElement | null
      expect(h1, 'heading exists').to.exist
      expect(p, 'paragraph exists').to.exist

      const rootRect = root.getBoundingClientRect()
      const h1Rect = (h1 as HTMLElement).getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const gapTop = h1Rect.bottom
      const gapBottom = pRect.top
      // If CSS collapses margins and we don't have a measurable gap, fall back to a point near the paragraph top.
      const yClient = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : pRect.top + 2

      const x = Math.floor(rootRect.width / 2)
      const y = Math.max(2, Math.floor(yClient - rootRect.top))

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

  it('does not override caret when clicking inside text', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    const selectionSignature = (sel: Selection | null) => {
      if (!sel || !sel.anchorNode) return 'null'
      const node = sel.anchorNode
      const textLen = node.textContent?.length ?? 0
      return `${node.nodeType}:${node.nodeName}:${sel.anchorOffset}:${textLen}`
    }

    cy.mount(
      <RichTextEditor
        initialContent="<p>Hello</p>"
        onContentChange={onContentChangeSpy}
      />
    )

    // First put caret at end (background click), then click inside the paragraph near the start.
    // If we wrongly override all clicks, the next character would append at the end.
    cy.get('[data-cy="editor-content"]').click('bottomRight')
    cy.get('[data-cy="editor-content"]').type('Z')

    let endSignature = ''
    cy.document().then((doc) => {
      endSignature = selectionSignature(doc.getSelection())
      expect(endSignature).to.not.eq('null')
    })

    // Click on the first character using DOM Range coordinates (reliable "text" click).
    // Then assert selection moved away from the end (i.e. we didn't force focus('end')).
    cy.get('[data-cy="editor-content"]').then(($root) => {
      const root = $root[0] as HTMLElement
      const p = root.querySelector('p') as HTMLElement | null
      const textNode = p?.firstChild
      expect(textNode, 'paragraph text node exists').to.exist

      const doc = root.ownerDocument
      const range = doc.createRange()
      range.setStart(textNode as ChildNode, 0)
      range.setEnd(textNode as ChildNode, 1)

      const charRect = range.getBoundingClientRect()
      const pRect = (p as HTMLElement).getBoundingClientRect()

      const x = Math.max(1, Math.floor(charRect.left - pRect.left + 1))
      const y = Math.max(1, Math.floor(charRect.top - pRect.top + charRect.height / 2))

      cy.wrap(p).click(x, y)
    })

    cy.document().then((doc) => {
      const afterSignature = selectionSignature(doc.getSelection())
      expect(afterSignature).to.not.eq('null')
      expect(afterSignature, 'selection changes after in-text click').to.not.eq(endSignature)
    })
  })

  it('applies bold formatting', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем жирный
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()

    // Проверяем что onContentChange был вызван и формат применён
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем курсив
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="italic-button"]').click()

    // Проверяем что onContentChange был вызван и формат применён
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем подчеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    // Проверяем что onContentChange был вызван и формат применён
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем зачеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="strike-button"]').click()

    // Проверяем что onContentChange был вызван и формат применён
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем выделение
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    // Проверяем что onContentChange был вызван и формат применён
    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('mark').should('contain', 'Hello World')
  })

  // TODO: Тест заголовков требует дополнительной настройки TipTap поведения
  // it('applies heading levels', () => {
  //   const onContentChangeSpy = cy.spy().as('onContentChangeSpy')
  //
  //   cy.mount(
  //     <RichTextEditor
  //       content=""
  //       onChange={onChangeSpy}
  //     />
  //   )
  //
  //   // Кликаем на H1 кнопку сначала
  //   cy.get('[data-cy="h1-button"]').click()
  //
  //   // Теперь вводим текст - он должен пойти в H1
  //   cy.get('[data-cy="editor-content"]').click()
  //   cy.get('[data-cy="editor-content"]').type('Heading 1')
  //
  //   // Проверяем что onChange был вызван с H1 (с учетом того что может быть пустой параграф)
  //   cy.get('@onContentChangeSpy').should('have.been.called')
  //   cy.get('@onContentChangeSpy').its('lastCall').its('args.0').should('include', '<h1>Heading 1</h1>')
  //
  //   // Меняем на H2 - выделяем весь контент
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="h2-button"]').click()
  //
  //   cy.get('@onContentChangeSpy').its('lastCall').its('args.0').should('include', '<h2>Heading 1</h2>')
  //
  //   // Меняем на H3
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="h3-button"]').click()
  //
  //   cy.get('@onContentChangeSpy').its('lastCall').its('args.0').should('include', '<h3>Heading 1</h3>')
  //
  //   // Возвращаем к параграфу
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="paragraph-button"]').click()
  //
  //   cy.get('@onContentChangeSpy').its('lastCall').its('args.0').should('include', '<p>Heading 1</p>')
  // })

  it('renders all basic formatting buttons', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Проверяем что основные кнопки форматирования отображаются
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')

    // Выделяем и применяем маркированный список
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bullet-list-button"]').click()

    // Проверяем что список создан
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')

    // Выделяем и применяем нумерованный список
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="ordered-list-button"]').click()

    // Проверяем что нумерованный список создан
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Task item')

    // Выделяем и применяем список задач
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="task-list-button"]').click()

    // Проверяем что список задач создан
    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('ul[data-type="taskList"]').should('exist')
    // TaskItem renders with data-checked attribute (true/false)
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Centered text')

    // Выделяем и применяем выравнивание по центру
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="align-center-button"]').click()

    // Проверяем что выравнивание применено
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

    // Проверяем что кнопки superscript и subscript отображаются
    cy.get('[data-cy="superscript-button"]').should('be.visible')
    cy.get('[data-cy="subscript-button"]').should('be.visible')

    // Проверяем что они кликабельны
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Underlined text')

    // Выделяем и применяем подчеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    // Проверяем что подчеркивание применено
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

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Highlighted text')

    // Выделяем и применяем выделение
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    // Проверяем что выделение применено
    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('mark').should('contain', 'Highlighted text')
  })

  // Extended tests for color picker functionality
  it('opens color picker popover when clicking color button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Click color button to open popover
    cy.get('[data-cy="color-button"]').click()

    // Wait for popover to appear and verify color picker is visible
    // TwitterPicker renders inside popover content
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

    // Type text
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Colored text')

    // Select all text
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Open color picker
    cy.get('[data-cy="color-button"]').click()

    // Wait for picker and click on first color swatch
    cy.get('.twitter-picker').should('be.visible')
    // TwitterPicker renders color swatches as divs with background color
    cy.get('.twitter-picker div[title]').first().click()

    // Verify onChange was called (color was applied)
    cy.get('@onContentChangeSpy').should('have.been.called')
  })

  // Font family and size selector tests - simplified to just verify they render
  it('renders font family and size selectors', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Verify selectors are rendered by checking for their trigger buttons
    // Select components render buttons with specific widths
    cy.get('button.w-\\[120px\\]').should('exist') // Font family selector
    cy.get('button.w-\\[70px\\]').should('exist')  // Font size selector
  })

  // Image insertion tests
  it('opens image URL prompt when clicking image button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Stub window.prompt
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com/image.jpg')
    })

    // Click image button
    cy.get('[data-cy="image-button"]').click()

    // Verify prompt was called
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

    // Stub window.prompt to return image URL
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com/test.jpg')
    })

    // Click image button
    cy.get('[data-cy="image-button"]').click()

    // Verify image was inserted
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

    // Clear spy to track only new calls
    cy.wrap(onContentChangeSpy).invoke('resetHistory')

    // Stub window.prompt to return null (cancelled)
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(null)
    })

    // Click image button
    cy.get('[data-cy="image-button"]').click()

    // Verify onChange was not called (no change)
    cy.get('@onContentChangeSpy').should('not.have.been.called')
  })

  // Link insertion tests
  it('opens link URL prompt when clicking link button', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Type and select text first
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Link text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Stub window.prompt
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com')
    })

    // Click link button
    cy.get('[data-cy="link-button"]').click()

    // Verify prompt was called
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

    // Type and select text
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Click here')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Stub window.prompt to return URL
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com')
    })

    // Click link button
    cy.get('[data-cy="link-button"]').click()

    // Verify link was created
    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('a').should('exist')
    cy.get('[data-cy="editor-content"]').find('a').should('have.attr', 'href', 'https://example.com')
  })

  // Indent/Outdent tests
  it('renders indent and outdent buttons', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Verify buttons are visible
    cy.get('[data-cy="indent-button"]').should('be.visible')
    cy.get('[data-cy="outdent-button"]').should('be.visible')
  })

  // Edge cases
  it('handles empty content gracefully', () => {
    const onContentChangeSpy = cy.spy().as('onContentChangeSpy')

    cy.mount(
      <RichTextEditor
        initialContent=""
        onContentChange={onContentChangeSpy}
      />
    )

    // Editor should render with empty paragraph
    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', '')
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

    // Editor should render long content
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

    // Editor should render complex content
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

    // Type text
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Format test')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Apply multiple formats rapidly
    cy.get('[data-cy="bold-button"]').click()
    cy.get('[data-cy="italic-button"]').click()
    cy.get('[data-cy="underline-button"]').click()

    // Verify all formats were applied
    cy.get('@onContentChangeSpy').should('have.been.called')
    cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    cy.get('[data-cy="editor-content"]').find('em').should('exist')
    cy.get('[data-cy="editor-content"]').find('u').should('exist')
  })

  // Clear formatting tests
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

    // Type text and apply formatting
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Formatted text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Apply bold, italic, underline
    cy.get('[data-cy="bold-button"]').click()
    cy.get('[data-cy="italic-button"]').click()
    cy.get('[data-cy="underline-button"]').click()

    // Verify formatting was applied
    cy.get('[data-cy="editor-content"]').find('strong').should('exist')
    cy.get('[data-cy="editor-content"]').find('em').should('exist')
    cy.get('[data-cy="editor-content"]').find('u').should('exist')

    // Select all and clear formatting
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="clear-formatting-button"]').click()

    // Verify formatting was removed
    cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('em').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('u').should('not.exist')
    // Text should still exist
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

    // Type text and apply formatting
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Highlighted text')
    cy.get('[data-cy="editor-content"]').type('{selectall}')

    // Apply highlight and strikethrough
    cy.get('[data-cy="highlight-button"]').click()
    cy.get('[data-cy="strike-button"]').click()

    // Verify formatting was applied
    cy.get('[data-cy="editor-content"]').find('mark').should('exist')
    cy.get('[data-cy="editor-content"]').find('s').should('exist')

    // Select all and clear formatting
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="clear-formatting-button"]').click()

    // Verify formatting was removed
    cy.get('[data-cy="editor-content"]').find('mark').should('not.exist')
    cy.get('[data-cy="editor-content"]').find('s').should('not.exist')
    cy.get('[data-cy="editor-content"]').should('contain', 'Highlighted text')
  })

  describe('Undo/Redo buttons', () => {
    it('renders undo and redo buttons, positioned before bold in toolbar', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      cy.get('[data-cy="undo-button"]').should('be.visible')
      cy.get('[data-cy="redo-button"]').should('be.visible')

      // Undo/Redo appear before Bold in the DOM
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

      // cy.type() synthetic events don't populate ProseMirror history reliably.
      // Use a toolbar button click (direct TipTap command) to create a history entry.
      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()

      cy.get('[data-cy="undo-button"]').should('not.be.disabled')
      cy.get('[data-cy="redo-button"]').should('be.disabled')
    })

    it('clicking undo reverts bold formatting', () => {
      // TipTap 3.x: can().redo() is not reactive via useEditor — redo button may stay
      // visually disabled even when ProseMirror redo stack is populated. Test behavior instead.
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
      // The undo BUTTON calls editor.chain().focus().undo(), where focus() dispatches
      // a transaction that clears the redo stack. Keyboard shortcuts bypass focus() and
      // go directly through ProseMirror's keymap, keeping the redo stack intact.
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

      // Use keyboard undo to preserve redo stack in TipTap 3.x
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')

      // Force a React re-render without mutating history entries:
      // toggle selection state only so disabled={!editor.can().redo()} is recalculated.
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="editor-content"]').type('{rightarrow}')

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

      // Use keyboard undo to preserve redo stack in TipTap 3.x
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')

      // Re-render toolbar state via selection-only changes (no history mutation).
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="editor-content"]').type('{rightarrow}')

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

      // Use keyboard undo to preserve redo stack in TipTap 3.x
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="editor-content"]').find('strong').should('not.exist')
      cy.get('[data-cy="editor-content"]').find('em').should('not.exist')

      // Re-render toolbar state via selection-only changes (no history mutation).
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="editor-content"]').type('{rightarrow}')

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

      // Enable undo button
      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="undo-button"]').should('not.be.disabled')

      // Radix Tooltip opens immediately on focus (no delayDuration)
      cy.get('[data-cy="undo-button"]').focus()
      cy.get('[role="tooltip"]').should('contain', 'Undo (Ctrl+Z)')
    })

    it('redo button has correct tooltip text', () => {
      cy.mount(
        <RichTextEditor initialContent="" onContentChange={cy.stub()} />
      )

      // Enable redo by using keyboard undo (bypasses button's focus() chain that
      // clears the redo stack). After keyboard undo, TipTap correctly enables redo.
      cy.get('[data-cy="editor-content"]').click()
      cy.get('[data-cy="editor-content"]').type('Hello')
      cy.get('[data-cy="editor-content"]').type('{selectall}')
      cy.get('[data-cy="bold-button"]').click()
      cy.get('[data-cy="editor-content"]').type('{ctrl}z')
      cy.get('[data-cy="redo-button"]').should('not.be.disabled')

      // Radix Tooltip opens immediately on focus (no delayDuration)
      cy.get('[data-cy="redo-button"]').focus()
      cy.get('[role="tooltip"]').should('contain', 'Redo (Ctrl+Shift+Z)')
    })
  })
})
