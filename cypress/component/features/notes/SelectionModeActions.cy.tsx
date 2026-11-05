import React from 'react'
import { SelectionModeActions } from '../../../../ui/web/components/features/notes/SelectionModeActions'

describe('SelectionModeActions', () => {
  it('renders compact count and action buttons', () => {
    const onSelectAll = cy.stub().as('onSelectAll')
    const onDelete = cy.stub().as('onDelete')
    const onCancel = cy.stub().as('onCancel')

    cy.mount(
      <SelectionModeActions
        selectedCount={4}
        onSelectAll={onSelectAll}
        onDelete={onDelete}
        onCancel={onCancel}
      />
    )

    cy.get('[data-testid="selection-mode-count"]').should('be.visible').and('have.text', '4 selected')
    cy.contains('button', 'Select all').click()
    cy.get('button[aria-label="Move to Trash"]').click()
    cy.contains('button', 'Done').click()

    cy.get('@onSelectAll').should('have.been.calledOnce')
    cy.get('@onDelete').should('have.been.calledOnce')
    cy.get('@onCancel').should('have.been.calledOnce')
  })

  it('respects disabled states and shows spinner while deleting', () => {
    cy.mount(
      <SelectionModeActions
        selectedCount={2}
        onSelectAll={() => undefined}
        onDelete={() => undefined}
        onCancel={() => undefined}
        selectingAllDisabled
        deletingDisabled
        deleting
      />
    )

    cy.contains('button', 'Select all').should('be.disabled')
    cy.contains('button', 'Done').should('be.disabled')
    cy.get('button[aria-label="Deleting"]').should('be.disabled')
    cy.get('button').find('.animate-spin').should('have.length', 1)
  })
})
