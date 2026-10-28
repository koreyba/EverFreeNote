import React from 'react'
import '../../../../app/globals.css'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'
import { NoteView } from '@ui/web/components/features/notes/NoteView'

const title = 'Большая заметка с очень длинным заголовком: проверяем, как в плитке выглядят название, текст и множество тегов'
const tags = ['работа', 'идеи', 'планы', 'дом', 'поездки', 'чтение', 'дизайн', 'web', 'mobile', 'заметки', 'черновик', 'позже']
const description = '<p>Это тестовая заметка для проверки интерфейса. Длинный заголовок, несколько строк текста и двенадцать тегов помогут оценить переносы и общий баланс.</p><h2>Всё важное — под рукой</h2><p>Спокойное пространство для мыслей, планов и новых идей.</p>'

function mountEditor() {
  cy.mount(<div className="flex h-screen flex-col"><NoteEditor initialTitle={title} initialDescription={description} initialTags={tags.join(', ')} isSaving={false} onSave={cy.stub().as('save')} onRead={cy.stub()} onBack={cy.stub()} /></div>)
}

describe('Note document design', { retries: 0 }, () => {
  it('pastes a single-line title without rewriting existing text and preserves native undo', () => {
    const original = 'Existing\nTitle'
    cy.mount(<NoteEditor initialTitle={original} isSaving={false} onAutoSave={cy.stub().as('autosave').resolves()} autosaveDelayMs={50} onSave={cy.stub().as('save')} onRead={cy.stub()} />)
    cy.get('[aria-label="Note title"]').focus().then(($title) => {
      const titleElement = $title[0] as HTMLTextAreaElement
      titleElement.setSelectionRange(0, 0)
      const clipboard = new DataTransfer()
      clipboard.setData('text/plain', 'First\r\nSecond\nThird ')
      titleElement.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }))
    })
    cy.get('[aria-label="Note title"]').should('have.value', `FirstSecondThird ${original}`)
    cy.get('@autosave').should('have.been.calledWithMatch', { title: `FirstSecondThird ${original}` })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@save').should('have.been.calledWithMatch', { title: `FirstSecondThird ${original}` })
    cy.get('[aria-label="Note title"]').focus().then(($title) => {
      $title[0].ownerDocument.execCommand('undo')
    })
    cy.get('[aria-label="Note title"]').should('have.value', original)
    cy.get('[aria-label="Note title"]').type('{end}{enter}')
    cy.get('[aria-label="Note title"]').should('have.value', original)
  })

  it('keeps document width and body typography consistent when switching to reading', () => {
    cy.viewport(1280, 900)
    function Document() {
      const [reading, setReading] = React.useState(false)
      return <div className="flex h-screen flex-col">{reading
        ? <NoteView note={{ id: 'design-note', title, description, tags, user_id: 'test', created_at: '2026-10-28', updated_at: '2026-10-28' }} onEdit={() => setReading(false)} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} />
        : <NoteEditor initialTitle={title} initialDescription={description} initialTags={tags.join(', ')} isSaving={false} onSave={cy.stub()} onRead={() => setReading(true)} />}</div>
    }
    cy.mount(<Document />)
    cy.get('.tiptap h2').should('be.visible').then(($heading) => {
      const style = getComputedStyle($heading[0])
      const metrics = { font: style.fontSize, line: style.lineHeight, top: style.marginTop, bottom: style.marginBottom, width: $heading[0].getBoundingClientRect().width }
      cy.screenshot('document-desktop-light')
      cy.get('html').invoke('addClass', 'dark')
      cy.screenshot('document-desktop-dark')
      cy.get('[data-cy="note-read-button"]').click()
      cy.get('.note-content h2').should(($reading) => {
        const readingStyle = getComputedStyle($reading[0])
        expect(readingStyle.fontSize).to.equal(metrics.font)
        expect(readingStyle.lineHeight).to.equal(metrics.line)
        expect(readingStyle.marginTop).to.equal(metrics.top)
        expect(readingStyle.marginBottom).to.equal(metrics.bottom)
        expect($reading[0].getBoundingClientRect().width).to.equal(metrics.width)
      })
      cy.screenshot('document-reader-desktop-dark')
      cy.get('html').invoke('removeClass', 'dark')
      cy.screenshot('document-reader-desktop-light')
    })
  })

  it('keeps a wrapping title searchable after editing and accessible at 320px', () => {
    cy.viewport(320, 667)
    mountEditor()
    cy.get('[aria-label="Show all 12 tags"]').should(($button) => {
      expect($button[0].getBoundingClientRect().width).to.be.at.least(44)
      expect($button[0].getBoundingClientRect().height).to.be.at.least(44)
    })
    cy.screenshot('document-mobile-320-full-title')
    cy.get('[placeholder="Note title"]').type(' и поиск')
    cy.get('[data-cy="note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('поиск')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 1')
    cy.get('[placeholder="Note title"]').should('have.attr', 'data-note-find-current')
    cy.get('[data-cy="note-find-close"]').click()
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@save').should('have.been.calledWithMatch', { title: `${title} и поиск` })
    cy.get('[placeholder="Note title"]').should(($title) => {
      expect($title[0].scrollWidth).to.be.at.most($title[0].clientWidth)
      expect($title[0].scrollHeight).to.be.at.most($title[0].clientHeight)
    })
  })

  afterEach(() => cy.get('html').invoke('removeClass', 'dark'))

  it('wraps the complete title on a phone and saves it without changing its text', () => {
    cy.viewport(390, 844)
    mountEditor()
    cy.get('[placeholder="Note title"]').should(($title) => {
      const element = $title[0]
      expect(element.scrollWidth, 'title does not clip horizontally').to.be.at.most(element.clientWidth)
      expect(element.scrollHeight, 'title does not clip vertically').to.be.at.most(element.clientHeight)
      expect(element.clientHeight, 'long title wraps').to.be.greaterThan(60)
    })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@save').should('have.been.calledWithMatch', { title, tags: tags.join(', ') })
    cy.screenshot('document-mobile-light')
    cy.get('html').invoke('addClass', 'dark')
    cy.screenshot('document-mobile-dark')
  })

  it('keeps every tag reachable and editable after expanding a long collection', () => {
    cy.viewport(390, 844)
    mountEditor()
    cy.get('[aria-label="Show all 12 tags"]').click()
    cy.contains('[data-cy="interactive-tag"]', 'позже').find('button').click()
    cy.get('[aria-label="Add tag"]').click()
    cy.get('[aria-label="Add tags"]').type('новый{enter}')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@save').should('have.been.calledWithMatch', { tags: [...tags.slice(0, -1), 'новый'].join(', ') })
  })

  it('shows the same complete title and expandable tags in reading mode', () => {
    cy.viewport(390, 844)
    cy.mount(<div className="flex h-screen flex-col"><NoteView note={{ id: 'design-note', title, description, tags, user_id: 'test', created_at: '2026-10-28', updated_at: '2026-10-28' }} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub().as('tag')} onRemoveTag={cy.stub()} onBack={cy.stub()} /></div>)
    cy.get('h1').should('have.text', title)
    cy.get('[aria-label="Show all 12 tags"]').should('be.visible')
    cy.screenshot('document-reader-mobile-light')
    cy.get('html').invoke('addClass', 'dark')
    cy.screenshot('document-reader-mobile-dark')
    cy.get('[aria-label="Show all 12 tags"]').click()
    cy.contains('button', 'позже').click()
    cy.get('@tag').should('have.been.calledWith', 'позже')
  })
})
