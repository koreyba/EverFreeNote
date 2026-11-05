import React from 'react'
import type { User } from '@supabase/supabase-js'
import { NoteService, type TrashEntry } from '../../../../core/services/notes'
import { TrashPage } from '../../../../ui/web/components/features/notes/TrashPage'
import '../../../../app/globals.css'

const entry = (id: string): TrashEntry => ({
  trash_id: id,
  original_note_id: `note-${id}`,
  user_id: 'trash-test-owner',
  title: `Deleted ${id}`,
  description: `<p>Recoverable body ${id}</p>`,
  tags: ['work'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  deleted_at: '2026-11-01T00:00:00Z',
  body_bytes: 24,
})

describe('Trash recovery and permanent deletion', () => {
  let rows: TrashEntry[]
  beforeEach(() => {
    rows = [entry('one'), entry('two')]
    cy.stub(NoteService.prototype, 'getTrash').callsFake(async () => ({
      notes: rows,
      totalCount: rows.length,
      hasMore: false,
    }))
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

  const mountTrash = () =>
    cy.mount(
      <div className="flex h-screen">
        <TrashPage
          isOffline={false}
          loadPending={async () => []}
          onChanged={cy.stub().as('changed')}
        />
      </div>,
      { supabaseUser: { id: 'trash-test-owner' } as User },
    )

  it('previews read-only content and restores one note on desktop', () => {
    cy.viewport(1280, 800)
    mountTrash()
    cy.get('@preview').should('not.have.been.called')
    cy.contains('button', 'Deleted one').click()
    cy.get('[aria-label="Trash note preview"]')
      .should('be.visible')
      .and('contain.text', 'Recoverable body one')
    cy.get('[aria-label="Trash note preview"] [contenteditable="true"]').should(
      'not.exist',
    )
    cy.screenshot('trash-desktop-preview')
    cy.get('[aria-label="Restore Deleted one"]').click()
    cy.get('@restore').should('have.been.calledOnceWithExactly', ['one'])
    cy.get('@changed').should('have.been.calledOnce')
    cy.contains('button', 'Deleted one').should('not.exist')
  })

  it('keeps a mobile preview usable and asks before single permanent deletion', () => {
    cy.viewport(375, 812)
    mountTrash()
    cy.contains('button', 'Deleted one').click()
    cy.contains('Recoverable body one').should('be.visible')
    cy.contains('button', 'Back to Trash').click()
    cy.get('[aria-label="Delete Deleted one forever"]').click()
    cy.contains('Delete note forever?').should('be.visible')
    cy.screenshot('trash-mobile-confirmation')
    cy.contains('button', 'Cancel').click()
    cy.get('@purge').should('not.have.been.called')
    cy.get('[aria-label="Delete Deleted one forever"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete forever').click()
    cy.get('@purge').should('have.been.calledOnceWithExactly', ['one'])
    cy.contains('button', 'Deleted two').should('be.visible')
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(375),
    )
  })

  it('freezes Empty Trash IDs and requires the exact count', () => {
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
