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

    cy.get('[aria-label="4 selected"]').should('be.visible').and('contain', '4')
    cy.contains('button', 'Select all').click()
    cy.contains('button', 'Delete (4)').click()
    cy.contains('button', 'Cancel').click()

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
    cy.contains('button', 'Cancel').should('be.disabled')
    cy.contains('button', 'Delete (2)').should('not.exist')
    cy.get('button').find('.animate-spin').should('have.length', 1)
  })
})
