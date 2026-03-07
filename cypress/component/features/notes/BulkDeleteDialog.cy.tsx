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

  it('resets confirmation input when the parent closes the dialog programmatically', () => {
    const DialogHarness = () => {
      const [open, setOpen] = React.useState(true)
      return (
        <div>
          <button type="button" onClick={() => setOpen(false)}>
            Close externally
          </button>
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
    cy.contains('Close externally').click({ force: true })
    cy.contains('Delete selected notes').should('not.exist')
    cy.contains('Reopen').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').should('have.value', '')
  })

  it('shows delete errors, clears the typed confirmation, and clears the error on retry input', () => {
    const DialogHarness = () => {
      const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

      return (
        <div>
          <button type="button" onClick={() => setErrorMessage('Delete failed')}>
            Show error
          </button>
          <BulkDeleteDialog
            open
            onOpenChange={() => undefined}
            count={3}
            onConfirm={() => undefined}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />
        </div>
      )
    }

    cy.mount(<DialogHarness />)

    cy.get('[data-testid="bulk-delete-confirm-input"]').type('3')
    cy.contains('Show error').click({ force: true })

    cy.get('[data-testid="bulk-delete-error"]').should('contain', 'Delete failed')
    cy.get('[data-testid="bulk-delete-confirm-input"]').should('have.value', '')

    cy.get('[data-testid="bulk-delete-confirm-input"]').type('3')
    cy.get('[data-testid="bulk-delete-error"]').should('not.exist')
  })

  it('keeps the dialog open when confirm reports an error', () => {
    const DialogHarness = () => {
      const [open, setOpen] = React.useState(true)
      const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

      return (
        <BulkDeleteDialog
          open={open}
          onOpenChange={setOpen}
          count={2}
          onConfirm={() => setErrorMessage('Delete failed')}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
        />
      )
    }

    cy.mount(<DialogHarness />)

    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()

    cy.get('[data-testid="bulk-delete-dialog"]').should('be.visible')
    cy.get('[data-testid="bulk-delete-error"]').should('contain', 'Delete failed')
  })
})
