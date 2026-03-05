import React from 'react'
import { useBulkDeleteConfirm } from '../../../../../ui/web/hooks/useBulkDeleteConfirm'

const TestHarness = ({ onConfirmDelete }: { onConfirmDelete: () => Promise<void> | void }) => {
  const { isDialogOpen, requestDelete, confirmDelete, setIsDialogOpen } = useBulkDeleteConfirm(onConfirmDelete)

  return (
    <div>
      <div data-cy="open">{String(isDialogOpen)}</div>
      <button type="button" data-cy="request" onClick={requestDelete}>
        Request
      </button>
      <button type="button" data-cy="confirm" onClick={() => void confirmDelete()}>
        Confirm
      </button>
      <button type="button" data-cy="close" onClick={() => setIsDialogOpen(false)}>
        Close
      </button>
    </div>
  )
}

describe('useBulkDeleteConfirm', () => {
  it('opens on request and calls callback only on confirm', () => {
    const onConfirm = cy.stub().as('onConfirm')

    cy.mount(<TestHarness onConfirmDelete={onConfirm} />)

    cy.get('[data-cy="open"]').should('contain', 'false')
    cy.get('[data-cy="request"]').click()
    cy.get('[data-cy="open"]').should('contain', 'true')
    cy.get('@onConfirm').should('not.have.been.called')

    cy.get('[data-cy="confirm"]').click()
    cy.get('@onConfirm').should('have.been.calledOnce')
  })

  it('always closes dialog after confirm callback resolves', () => {
    const onConfirm = cy.stub().as('onConfirm')
    onConfirm.resolves()

    cy.mount(<TestHarness onConfirmDelete={onConfirm} />)

    cy.get('[data-cy="request"]').click()
    cy.get('[data-cy="open"]').should('contain', 'true')
    cy.get('[data-cy="confirm"]').click()

    cy.get('[data-cy="open"]').should('contain', 'false')
  })
})
