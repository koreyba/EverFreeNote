import React from 'react'
import '../../../../app/globals.css'
import { NotesTabStrip } from '@ui/web/components/features/notes/NotesTabStrip'
import { NoteDragProvider } from '@ui/web/providers/NoteDragProvider'
import { NOTE_DRAG_TYPE, NOTE_TAB_DRAG_TYPE } from '@ui/web/lib/noteDrag'
import { createNoteWorkspaceState, reorderWorkspaceTab, type NoteWorkspaceState } from '@core/services/noteWorkspaceTabs'

const viewport = '[aria-label="Open notes"]'
const rows = '[data-tab-id]'

function Harness({ count = 20, width = 360 }: { count?: number; width?: number }) {
  const [state, setState] = React.useState<NoteWorkspaceState>(() => {
    const initial = createNoteWorkspaceState(() => 'tab-1', 'owner')
    return { ...initial, activeTabId: `tab-${count}`, tabs: Array.from({ length: count }, (_, index) => {
      const id = `tab-${index + 1}`
      return { ...initial.tabs[0], id, noteId: id,
        note: { id, user_id: 'owner', title: `Tab ${index + 1}`, description: '', tags: [], created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z' },
      }
    }) }
  })
  return <div style={{ width }}><NoteDragProvider ownerId="owner" enabled={false} tabsEnabled>
    <NotesTabStrip tabs={state.tabs} activeTabId={state.activeTabId} onAddTab={() => undefined} onCloseTab={() => undefined}
      onActivateTab={id => setState(current => ({ ...current, activeTabId: id }))}
      onReorderTab={(id, target, position) => setState(current => reorderWorkspaceTab(current, id, target, position))} />
  </NoteDragProvider></div>
}

const twoFrames = () => cy.window().then(win => new Cypress.Promise<void>(resolve => {
  win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))
}))

describe('Native tab ordering', { retries: 0 }, () => {
  beforeEach(() => { cy.viewport(1200, 800) })

  it('scrolls overflowing tabs toward the drag edge and stops on cancellation', () => {
    cy.mount(<Harness />)
    let start: number
    cy.get(viewport).should($viewport => { expect($viewport[0].scrollLeft).to.be.greaterThan(500) })
      .then($viewport => { start = $viewport[0].scrollLeft })
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      cy.get('[data-tab-id="tab-20"]').trigger('dragstart', { dataTransfer, scrollBehavior: false })
      cy.get(viewport).then($viewport => {
        const bounds = $viewport[0].getBoundingClientRect()
        cy.wrap($viewport).trigger('dragover', { dataTransfer, clientX: bounds.left + 2, scrollBehavior: false })
          .should($current => { expect($current[0].scrollLeft).to.be.lessThan(start - 20) })
      })
      cy.get('[data-cy="tab-insertion-indicator"]').should('exist')
      cy.get(viewport).trigger('dragend', { dataTransfer, scrollBehavior: false })
    })
    cy.get('[data-cy="tab-insertion-indicator"]').should('not.exist')
    twoFrames()
    let stopped: number
    cy.get(viewport).then($viewport => { stopped = $viewport[0].scrollLeft })
    twoFrames()
    cy.get(viewport).should($viewport => { expect($viewport[0].scrollLeft).to.equal(stopped) })
    cy.get(rows).should($rows => { expect(Array.from($rows, row => row.getAttribute('data-tab-id'))).to.deep.equal(Array.from({ length: 20 }, (_, i) => `tab-${i + 1}`)) })
  })

  it('inserts after the last tab while keeping the active tab selected', () => {
    cy.mount(<Harness count={3} width={640} />)
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      cy.get('[data-tab-id="tab-1"]').trigger('dragstart', { dataTransfer })
      cy.get('[data-tab-id="tab-3"]').then($target => {
        const clientX = $target[0].getBoundingClientRect().right - 4
        cy.get(viewport).trigger('dragover', { dataTransfer, clientX }).trigger('drop', { dataTransfer, clientX }).trigger('dragend', { dataTransfer })
      })
    })
    cy.get(rows).should($rows => { expect(Array.from($rows, row => row.getAttribute('data-tab-id'))).to.deep.equal(['tab-2', 'tab-3', 'tab-1']) })
    cy.get('[data-cy="workspace-tab"][aria-pressed="true"]').should('have.attr', 'title', 'Tab 3')
  })

  it('rejects another owner’s tab payload without changing order', () => {
    cy.mount(<Harness count={3} width={640} />)
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify({ version: 1, ownerId: 'other', tabId: 'tab-3' }))
      dataTransfer.setData(NOTE_TAB_DRAG_TYPE, '1')
      cy.get(viewport).then($viewport => {
        const clientX = $viewport[0].getBoundingClientRect().left + 2
        cy.wrap($viewport).trigger('dragover', { dataTransfer, clientX }).trigger('drop', { dataTransfer, clientX })
      })
    })
    cy.get(rows).should($rows => { expect(Array.from($rows, row => row.getAttribute('data-tab-id'))).to.deep.equal(['tab-1', 'tab-2', 'tab-3']) })
    cy.get('[data-cy="tab-insertion-indicator"]').should('not.exist')
  })

  it('does not turn a note-list drag into a tab-order action', () => {
    cy.mount(<Harness count={3} width={640} />)
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      dataTransfer.setData(NOTE_DRAG_TYPE, JSON.stringify({ version: 1, ownerId: 'owner', noteId: 'tab-3' }))
      cy.get(viewport).trigger('dragover', { dataTransfer, clientX: 0 }).trigger('drop', { dataTransfer, clientX: 0 })
    })
    cy.get(rows).should($rows => { expect(Array.from($rows, row => row.getAttribute('data-tab-id'))).to.deep.equal(['tab-1', 'tab-2', 'tab-3']) })
    cy.get('[data-cy="tab-insertion-indicator"]').should('not.exist')
  })
})
