import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'grid-test-user', email: 'grid@example.invalid' } as User
const notes = ['First note', 'Second note', 'Third note'].map((title, index) => ({
  id: `grid-note-${index}`, user_id: user.id, title,
  description: `<p>Preview for ${title}</p>`,
  tags: index === 0 ? ['work', 'design', 'ideas', 'research', 'plans', 'mobile', 'project', 'testing', 'important', 'later', 'personal', 'notes'] : ['work'],
  created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z',
}))

function MobileWebApp() {
  const controller = useNoteAppController()
  return <NotesShell controller={controller} />
}

describe('Mobile notes layout', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    const client = createClient('https://notes-grid.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://notes-grid.invalid/**', (req) => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        const note = notes.find((item) => req.url.includes(item.id)) ?? notes[0]
        req.reply({ body: single ? note : notes, headers: { 'content-range': '0-2/3', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then((win) => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><MobileWebApp /></SupabaseTestProvider>)
  })

  it('switches between the list and two-column tiles while keeping notes accessible', () => {
    cy.contains('[data-testid="note-card"]', 'First note').should('be.visible')
    cy.get('[aria-label="Grid view"]').click().should('have.attr', 'aria-pressed', 'true')
    cy.contains('[data-testid="note-card"]', 'First note').contains('+10').should('be.visible')
    cy.get('[data-testid="note-card"]').should('have.length', 3).then(($cards) => {
      const first = $cards[0].getBoundingClientRect()
      const second = $cards[1].getBoundingClientRect()
      expect(second.left).to.be.greaterThan(first.right)
      expect(Math.abs(second.top - first.top)).to.be.lessThan(2)
    })
    cy.contains('[data-testid="note-card"] button', 'Second note').click()
    cy.contains('Preview for Second note').should('be.visible')
    cy.get('[data-cy="note-back-button"]').click()
    cy.get('[aria-label="Grid view"]').should('have.attr', 'aria-pressed', 'true')
    cy.get('[aria-label="List view"]').click().should('have.attr', 'aria-pressed', 'true')
    cy.get('[data-testid="note-card"]').then(($cards) => {
      expect($cards[1].getBoundingClientRect().top).to.be.greaterThan($cards[0].getBoundingClientRect().top)
    })
  })

  it('keeps swipe and selection actions usable on tiles', () => {
    cy.intercept('DELETE', 'https://notes-grid.invalid/rest/v1/notes*').as('deleteNote')
    cy.get('[aria-label="Grid view"]').click()
    cy.contains('[data-testid="note-card"]', 'First note')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 170, clientY: 260 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 80, clientY: 262 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 80, clientY: 262 })
    cy.get('button[aria-label=\'Delete note "First note"\']').should('be.visible').click()
    cy.get('[role="alertdialog"]').should('contain', 'First note').contains('button', 'Cancel').click()
    cy.get('@deleteNote.all').should('have.length', 0)
    cy.contains('[data-testid="sidebar-container"] button', 'Select').click()
    cy.contains('[data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-testid="selection-mode-count"]').should('have.attr', 'aria-label', '1 selected')
    cy.get('[data-testid="selection-mode-cancel"]').click()
    cy.contains('[data-testid="note-card"]', 'First note').should('be.visible')
  })

  it('closes a revealed swipe action when switching layouts', () => {
    cy.get('[aria-label="Grid view"]').click()
    cy.contains('[data-testid="note-card"]', 'First note')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 170, clientY: 260 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 80, clientY: 262 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 80, clientY: 262 })
    cy.get('button[aria-label=\'Delete note "First note"\']').should('be.visible')
    cy.get('[aria-label="List view"]').click()
    cy.get('button[aria-label=\'Delete note "First note"\']').should('be.disabled')
  })
})
