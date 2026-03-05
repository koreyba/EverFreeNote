import React from 'react'
import { BulkDeleteDialog } from '../../../../ui/web/components/features/notes/BulkDeleteDialog'

describe('BulkDeleteDialog', () => {
  it('keeps delete disabled until exact count is entered', () => {
    const onOpenChange = cy.stub().as('onOpenChange')
    const onConfirm = cy.stub().as('onConfirm')

    cy.mount(
      <BulkDeleteDialog
        open
        onOpenChange={onOpenChange}
        count={3}
        onConfirm={onConfirm}
      />
    )

    cy.contains('Delete selected notes').should('be.visible')
    cy.get('[data-testid="bulk-delete-confirm"]').should('be.disabled')

    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').should('be.disabled')

    cy.get('[data-testid="bulk-delete-confirm-input"]').clear().type('3')
    cy.get('[data-testid="bulk-delete-confirm"]').should('not.be.disabled').click()

    cy.get('@onConfirm').should('have.been.calledOnce')
  })

  it('resets confirmation input when dialog closes and opens again', () => {
    const DialogHarness = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen
          </button>
          <BulkDeleteDialog
            open={open}
            onOpenChange={setOpen}
            count={2}
            onConfirm={() => undefined}
          />
        </div>
      )
    }

    cy.mount(<DialogHarness />)

    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-cancel"]').click()
    cy.contains('Delete selected notes').should('not.exist')
    cy.contains('Reopen').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').should('have.value', '')
  })
})
