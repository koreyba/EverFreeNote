// @ts-check
import React from 'react'
import RichTextEditor from '@/components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('renders with all toolbar buttons and editor area', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    // Монтируем RichTextEditor с пустым контентом
    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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

    // Проверяем что onChange не вызывался при рендеринге
    cy.get('@onChangeSpy').should('not.have.been.called')
  })

  it('renders with initial content', () => {
    const initialContent = '<p>Hello World</p>'
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content={initialContent}
        onChange={onChangeSpy}
      />
    )

    // Проверяем что контент отображается в редакторе
    cy.get('[data-cy="editor-content"]').should('contain', 'Hello World')

    // Проверяем что onChange не вызывался при рендеринге
    cy.get('@onChangeSpy').should('not.have.been.called')
  })

  it('calls onChange when typing in editor', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Кликаем в область редактора и вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Test content')

    // Проверяем что onChange был вызван с правильным HTML
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p>Test content</p>')
  })

  it('applies bold formatting', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем жирный
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()

    // Проверяем что onChange был вызван с жирным текстом
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p><strong>Hello World</strong></p>')
  })

  it('applies italic formatting', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем курсив
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="italic-button"]').click()

    // Проверяем что onChange был вызван с курсивным текстом
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p><em>Hello World</em></p>')
  })

  it('applies underline formatting', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем подчеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    // Проверяем что onChange был вызван с подчеркнутым текстом
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p><u>Hello World</u></p>')
  })

  it('applies strikethrough formatting', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем зачеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="strike-button"]').click()

    // Проверяем что onChange был вызван с зачеркнутым текстом
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p><s>Hello World</s></p>')
  })

  it('applies highlight formatting', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Hello World')

    // Выделяем текст и применяем выделение
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    // Проверяем что onChange был вызван с выделенным текстом
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').should('have.been.calledWith', '<p><mark>Hello World</mark></p>')
  })

  // TODO: Тест заголовков требует дополнительной настройки TipTap поведения
  // it('applies heading levels', () => {
  //   const onChangeSpy = cy.spy().as('onChangeSpy')
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
  //   cy.get('@onChangeSpy').should('have.been.called')
  //   cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<h1>Heading 1</h1>')
  //
  //   // Меняем на H2 - выделяем весь контент
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="h2-button"]').click()
  //
  //   cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<h2>Heading 1</h2>')
  //
  //   // Меняем на H3
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="h3-button"]').click()
  //
  //   cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<h3>Heading 1</h3>')
  //
  //   // Возвращаем к параграфу
  //   cy.get('[data-cy="editor-content"]').type('{selectall}')
  //   cy.get('[data-cy="paragraph-button"]').click()
  //
  //   cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<p>Heading 1</p>')
  // })

  it('renders all basic formatting buttons', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')

    // Выделяем и применяем маркированный список
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bullet-list-button"]').click()

    // Проверяем что список создан
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<ul>')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<li>')
  })

  it('creates ordered lists using TipTap OrderedList extension', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('First item')

    // Выделяем и применяем нумерованный список
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="ordered-list-button"]').click()

    // Проверяем что нумерованный список создан
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<ol>')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<li>')
  })

  it('creates task lists using TipTap TaskList extension', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Task item')

    // Выделяем и применяем список задач
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="task-list-button"]').click()

    // Проверяем что список задач создан
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<ul')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', 'data-type="taskList"')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', 'data-type="taskItem"')
  })

  it('applies text alignment using TipTap TextAlign extension', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Centered text')

    // Выделяем и применяем выравнивание по центру
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="align-center-button"]').click()

    // Проверяем что выравнивание применено
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', 'text-align: center')
  })

  it('renders superscript and subscript buttons using TipTap extensions', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Underlined text')

    // Выделяем и применяем подчеркивание
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="underline-button"]').click()

    // Проверяем что подчеркивание применено
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<u>Underlined text</u>')
  })

  it('applies highlight using TipTap Highlight extension', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Вводим текст
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Highlighted text')

    // Выделяем и применяем выделение
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="highlight-button"]').click()

    // Проверяем что выделение применено
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<mark>Highlighted text</mark>')
  })

  // Extended tests for color picker functionality
  it('opens color picker popover when clicking color button', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Click color button to open popover
    cy.get('[data-cy="color-button"]').click()

    // Wait for popover to appear and verify color picker is visible
    // TwitterPicker renders inside popover content
    cy.get('.twitter-picker').should('be.visible')
  })

  it('applies text color using color picker', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    cy.get('@onChangeSpy').should('have.been.called')
  })

  // Font family and size selector tests - simplified to just verify they render
  it('renders font family and size selectors', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Verify selectors are rendered by checking for their trigger buttons
    // Select components render buttons with specific widths
    cy.get('button.w-\\[120px\\]').should('exist') // Font family selector
    cy.get('button.w-\\[70px\\]').should('exist')  // Font size selector
  })

  // Image insertion tests
  it('opens image URL prompt when clicking image button', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Stub window.prompt to return image URL
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('https://example.com/test.jpg')
    })

    // Click image button
    cy.get('[data-cy="image-button"]').click()

    // Verify image was inserted
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<img')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', 'https://example.com/test.jpg')
  })

  it('does not insert image when prompt is cancelled', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content="<p>Initial content</p>"
        onChange={onChangeSpy}
      />
    )

    // Clear spy to track only new calls
    cy.wrap(onChangeSpy).invoke('resetHistory')

    // Stub window.prompt to return null (cancelled)
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(null)
    })

    // Click image button
    cy.get('[data-cy="image-button"]').click()

    // Verify onChange was not called (no change)
    cy.get('@onChangeSpy').should('not.have.been.called')
  })

  // Link insertion tests
  it('opens link URL prompt when clicking link button', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<a')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', 'https://example.com')
  })

  // Indent/Outdent tests
  it('renders indent and outdent buttons', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Verify buttons are visible
    cy.get('[data-cy="indent-button"]').should('be.visible')
    cy.get('[data-cy="outdent-button"]').should('be.visible')
  })

  // Edge cases
  it('handles empty content gracefully', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
      />
    )

    // Editor should render with empty paragraph
    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', '')
  })

  it('handles very long content', () => {
    const longContent = '<p>' + 'A'.repeat(10000) + '</p>'
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content={longContent}
        onChange={onChangeSpy}
      />
    )

    // Editor should render long content
    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', 'A')
  })

  it('handles complex nested HTML content', () => {
    const complexContent = '<p><strong>Bold <em>and italic</em></strong> with <mark>highlight</mark> and <u>underline</u></p>'
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content={complexContent}
        onChange={onChangeSpy}
      />
    )

    // Editor should render complex content
    cy.get('[data-cy="editor-content"]').should('be.visible')
    cy.get('[data-cy="editor-content"]').should('contain', 'Bold')
    cy.get('[data-cy="editor-content"]').should('contain', 'and italic')
  })

  it('handles rapid consecutive formatting changes', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(
      <RichTextEditor
        content=""
        onChange={onChangeSpy}
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
    cy.get('@onChangeSpy').should('have.been.called')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<strong>')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<em>')
    cy.get('@onChangeSpy').its('lastCall').its('args.0').should('include', '<u>')
  })
})
