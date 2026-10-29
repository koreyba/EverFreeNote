import React from 'react'
import '../../../../app/globals.css'
import { NoteCard } from '../../../../ui/web/components/features/notes/NoteCard'
import type { Note } from '../../../../core/types/domain'

const note: Note = {
  id: 'note-1', user_id: 'test-user', title: 'Multiline note', tags: ['ideas'],
  description: '<p>Привет 😀 &lt; 2 &amp; 7 &gt; 3<br><br><br>尾 строка!</p>',
  created_at: '2025-12-31T10:00:00.000Z', updated_at: '2025-12-31T10:00:00.000Z',
}

function mountCard(description: string) {
  cy.mount(<div className="bg-background p-4" style={{ width: 390 }}>
    <NoteCard note={{ ...note, description }} variant="compact" onClick={() => {}} />
  </div>)
}

describe('note preview text in the browser', { retries: 0 }, () => {
  beforeEach(() => cy.viewport(390, 844))

  it('shows readable separators in a saved multiline note', () => {
    mountCard(note.description)
    cy.get('[data-testid="note-card"]').should('be.visible').screenshot('multiline-note-card')
    cy.get('[data-testid="note-card"] p').first()
      .should('have.text', 'Привет 😀 < 2 & 7 > 3 尾 строка!')
      .find('br').should('not.exist')
  })

  it('matches the server result for blocks without separating inline formatting', () => {
    mountCard('<p>First<br><br>Second</p><p>Third <strong>word</strong></p>')
    cy.get('[data-testid="note-card"] p').first().should('have.text', 'First Second Third word')
      .find('strong, br').should('not.exist')
  })

  it('retains ambiguous legacy entities and collapses plain CRLF for display', () => {
    mountCard('Literal &amp; &copy=2 and &#39;\r\n\r\n尾 😀')
    cy.get('[data-testid="note-card"] p').first().should('have.text', 'Literal &amp; &copy=2 and &#39; 尾 😀')
  })

  it('decodes one HTML layer while displaying escaped markup as text', () => {
    mountCard('<p>&nbsp;Fish &amp; chips &gt; 10<br>&amp;amp; &lt;img src=x onerror=bad()&gt;&nbsp;</p>')
    cy.get('[data-testid="note-card"] p').first()
      .should('have.text', '\u00a0Fish & chips > 10 &amp; <img src=x onerror=bad()>\u00a0')
      .find('img, br').should('not.exist')
  })

  it('does not load remote resources or construct custom elements in note markup', () => {
    let requests = 0
    let constructed = 0
    cy.intercept('https://preview-network.invalid/**', (request) => {
      requests++
      request.reply({ statusCode: 204 })
    })
    cy.window().then((win) => {
      win.customElements.define('preview-load-probe', class extends win.HTMLElement {
        constructor() {
          super()
          constructed++
        }
      })
    })
    mountCard('<p>Safe &amp; visible<img src="https://preview-network.invalid/img" srcset="https://preview-network.invalid/srcset 1x"><preview-load-probe> text</preview-load-probe><iframe src="https://preview-network.invalid/frame"></iframe><video poster="https://preview-network.invalid/poster"><source src="https://preview-network.invalid/source"></video><svg><image href="https://preview-network.invalid/svg"></image></svg><style>body{background:url(https://preview-network.invalid/style)}</style><script>window.previewScriptRan = true</script></p>')
    cy.get('[data-testid="note-card"] p').first().should('have.text', 'Safe & visible text')
      .find('img, iframe, script, preview-load-probe').should('not.exist')
    cy.wait(700).then(() => {
      expect(requests).to.equal(0)
      expect(constructed).to.equal(0)
    })
    cy.window().then((win) => {
      expect((win as Window & { previewScriptRan?: boolean }).previewScriptRan).to.be.undefined
    })
  })

  it('preserves literal nonbreaking spaces at both preview edges', () => {
    mountCard(' \r\n\u00a0First\u00a0 \r\n')
    cy.get('[data-testid="note-card"] p').first().should('have.text', '\u00a0First\u00a0')
  })

  it('keeps long inline text intact in the DOM and removes unsafe content', () => {
    const longText = 'long '.repeat(300)
    mountCard(`<p>${longText}<strong>tail</strong></p><p>next<script>unsafe()</script></p>`)
    cy.get('[data-testid="note-card"] p').first().should('have.text', `${longText}tail next`)
      .find('script, strong').should('not.exist')
  })
})
