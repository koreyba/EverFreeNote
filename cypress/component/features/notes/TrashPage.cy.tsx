import React from 'react'
import type { User } from '@supabase/supabase-js'
import { NoteService, type TrashEntry } from '../../../../core/services/notes'
import { TrashPage } from '../../../../ui/web/components/features/notes/TrashPage'
import { MobileWorkspace } from '../../../../ui/web/components/features/navigation/MobileWorkspace'
import { NavRail } from '../../../../ui/web/components/features/navigation/NavRail'
import '../../../../app/globals.css'

const loadPending = async () => []

const entry = (id: string): TrashEntry => ({
  trash_id: id,
  original_note_id: `note-${id}`,
  user_id: 'trash-test-owner',
  title: `Deleted ${id}`,
  description: `<p>Recoverable body ${id}</p><p>Full note content ${id}</p>`,
  tags: ['work', 'draft'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  deleted_at: '2026-11-01T00:00:00Z',
  body_bytes: 24,
})

describe('Trash recovery and permanent deletion', () => {
  let rows: TrashEntry[]
  beforeEach(() => {
    rows = [entry('one'), entry('two')]
    cy.stub(NoteService.prototype, 'getTrash')
      .callsFake(async (_owner: string, page = 0) => ({
        notes: rows.slice(page * 50, (page + 1) * 50).map(({ description, ...row }) => ({
          ...row,
          preview_html: description.split('</p>', 1)[0] + '</p>',
        })),
        totalCount: rows.length,
        hasMore: (page + 1) * 50 < rows.length,
      }))
      .as('list')
    cy.stub(NoteService.prototype, 'getTrashedNote')
      .callsFake(async (id) => rows.find((row) => row.trash_id === id)!)
      .as('preview')
    cy.stub(NoteService.prototype, 'getAllTrashIds').callsFake(async () =>
      rows.map((row) => row.trash_id),
    )
    cy.stub(NoteService.prototype, 'restoreTrashedNotes')
      .callsFake(async (ids: string[]) => {
        rows = rows.filter((row) => !ids.includes(row.trash_id))
        return ids.map((trash_id) => ({
          trash_id,
          status: 'restored' as const,
        }))
      })
      .as('restore')
    cy.stub(NoteService.prototype, 'purgeTrashedNotes')
      .callsFake(async (ids: string[]) => {
        rows = rows.filter((row) => !ids.includes(row.trash_id))
        return ids.map((trash_id) => ({ trash_id, status: 'purged' as const }))
      })
      .as('purge')
  })

  function TrashFixture({ onChanged }: { onChanged: () => void }) {
    const [layout, setLayout] = React.useState<'list' | 'grid'>('list')
    return (
      <MobileWorkspace viewKey="trash" className="flex h-[100dvh] overflow-hidden">
        <NavRail activeView="trash" onSelectView={() => {}} onOpenSearch={() => {}} onOpenSettings={() => {}} />
        <TrashPage
          isOffline={false}
          loadPending={loadPending}
          onChanged={onChanged}
          noteListLayout={layout}
          onChangeNoteListLayout={setLayout}
        />
      </MobileWorkspace>
    )
  }

  const mountTrash = () =>
    cy.mount(
      <TrashFixture onChanged={cy.stub().as('changed')} />,
      { supabaseUser: { id: 'trash-test-owner' } as User },
    )

  const sidebar = '[data-testid="trash-sidebar"]'
  const reader = '[data-testid="trash-note-reader"]'
  const card = '[data-testid="note-card"]'

  it('uses the Notes sidebar, cards, and reader on a wide desktop', () => {
    cy.viewport(1280, 720)
    mountTrash()
    cy.get(sidebar).should(($sidebar) => {
      expect($sidebar[0].getBoundingClientRect().width).to.be.lessThan(600)
    })
    cy.get(sidebar).contains(card, 'Deleted one')
      .should('contain.text', 'Recoverable body one')
      .and('contain.text', 'work')
      .and('contain.text', 'draft')
      .and('not.contain.text', 'Full note content one')
    cy.get('@preview').should('not.have.been.called')
    cy.get('[aria-label="Grid view"]').click().should('have.attr', 'aria-pressed', 'true')
    cy.get(sidebar).find(card).should(($cards) => {
      expect($cards[0].getBoundingClientRect().top).to.equal($cards[1].getBoundingClientRect().top)
    })
    cy.get('[aria-label="List view"]').click()
    cy.contains('button', 'Deleted one').click()
    cy.get(reader).find('.note-document-title').should('have.text', 'Deleted one')
    cy.get(reader).find('[data-cy="note-tag-list"]').should('contain.text', 'work').and('contain.text', 'draft')
    cy.get(reader).contains('Full note content one').should('be.visible')
    cy.get(reader).find('[contenteditable="true"], [data-cy="note-edit-button"], [title^="Remove tag"]').should('not.exist')
    cy.screenshot('trash-desktop-preview')
    cy.get(reader).find('[aria-label="Restore note"]').click()
    cy.get('@restore').should('have.been.calledOnceWithExactly', ['one'])
    cy.get('@changed').should('have.been.calledOnce')
    cy.contains('button', 'Deleted one').should('not.exist')
  })

  it('keeps the compact sidebar, reader and batch actions usable on a portrait tablet', () => {
    cy.viewport(768, 1024)
    mountTrash()
    cy.get('[aria-label="Expand panel"]').click()
    cy.get(sidebar).find('[role="separator"]').focus().type('{end}')
    cy.contains('button', 'Deleted one').click()
    cy.get(sidebar).should('be.visible')
    cy.get(reader).find('.note-document-title').should('be.visible')
    cy.get(reader).find('[aria-label="Delete note forever"]').should(($button) => {
      expect($button[0].getBoundingClientRect().right).to.be.lessThan(768)
    })
    cy.screenshot('trash-tablet-preview')
    cy.get(sidebar).contains('button', /^Select$/).click()
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[aria-label="2 selected"]').should('be.visible')
    cy.screenshot('trash-tablet-selection')
    cy.get('[data-testid="selection-mode-delete"]').should(($button) => {
      expect($button[0].getBoundingClientRect().right).to.be.lessThan(
        $button.closest(sidebar)[0].getBoundingClientRect().right,
      )
    }).click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.get('@purge').should('have.been.calledOnceWithExactly', ['one', 'two'])
    cy.contains('Trash is empty.').should('be.visible')
    cy.contains('button', 'Empty Trash').should('not.exist')
    cy.get('[data-testid="selection-mode-actions"]').should('not.exist')
  })

  it('opens the reader full width on a small phone and confirms permanent deletion', () => {
    cy.viewport(320, 700)
    mountTrash()
    cy.get(sidebar).contains(card, 'Deleted one').should('be.visible')
    cy.screenshot('trash-phone-list')
    cy.contains('button', 'Deleted one').click()
    cy.get(reader).contains('Full note content one').should('be.visible')
    cy.get(sidebar).should('not.be.visible')
    cy.get(reader).should(($reader) => {
      expect($reader[0].getBoundingClientRect().width).to.equal(320)
      expect($reader[0].scrollWidth).to.be.at.most(320)
    })
    cy.screenshot('trash-phone-preview')
    cy.get('[data-cy="note-back-button"]').click()
    cy.get(sidebar).should('be.visible').contains('button', 'Deleted one').click()
    cy.get(reader).find('[aria-label="Delete note forever"]').click()
    cy.contains('Delete note forever?').should('be.visible')
    cy.screenshot('trash-mobile-confirmation')
    cy.contains('button', 'Cancel').click()
    cy.get('@purge').should('not.have.been.called')
    cy.get(reader).find('[aria-label="Delete note forever"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete forever').click()
    cy.get('@purge').should('have.been.calledOnceWithExactly', ['one'])
    cy.contains('button', 'Deleted two').should('be.visible')
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320),
    )
  })

  it('loads one next page on scroll in a short landscape viewport', () => {
    cy.viewport(844, 390)
    cy.then(() => {
      rows = Array.from({ length: 55 }, (_, index) => entry(String(index + 1)))
    })
    mountTrash()
    cy.get(sidebar).contains('50 of 55 notes').should('be.visible')
    cy.get(sidebar).find('.notes-sidebar-controls').should(($controls) => {
      expect($controls[0].scrollWidth).to.be.at.most($controls[0].clientWidth)
    })
    cy.get(sidebar).find('[role="list"]').scrollTo('bottom')
    cy.get('@list').should('have.been.calledWithExactly', 'trash-test-owner', 1)
    cy.get(sidebar).contains('55 of 55 notes').should('be.visible')
    cy.get('@list').should('have.callCount', 2)
    cy.get('@preview').should('not.have.been.called')
  })

  it('freezes Empty Trash IDs and requires the exact count', () => {
    cy.viewport(1024, 768)
    mountTrash()
    cy.contains('button', 'Empty Trash').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').should('be.visible')
    cy.then(() => {
      rows = [...rows, entry('new-arrival')]
    })
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('1')
    cy.get('[data-testid="bulk-delete-confirm"]').should('be.disabled')
    cy.get('[data-testid="bulk-delete-confirm-input"]').clear().type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.get('@purge').should('have.been.calledOnceWithExactly', ['one', 'two'])
    cy.contains('button', 'Deleted new-arrival').should('be.visible')
    cy.contains('button', 'Deleted one').should('not.exist')
  })
})
