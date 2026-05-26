import { useNoteSelection } from '../../../../../ui/web/hooks/useNoteSelection'

const Harness = () => {
  const selection = useNoteSelection()

  return (
    <div>
      <div data-cy="selectionMode">{selection.selectionMode ? 'true' : 'false'}</div>
      <div data-cy="selectedCount">{selection.selectedNoteIds.size}</div>
      <button type="button" data-cy="enter-selection" onClick={selection.enterSelectionMode}>
        Enter Selection
      </button>
      <button type="button" data-cy="exit-selection" onClick={selection.exitSelectionMode}>
        Exit Selection
      </button>
      <button type="button" data-cy="toggle-note-1" onClick={() => selection.toggleNoteSelection('note-1')}>
        Toggle Note 1
      </button>
      <button type="button" data-cy="toggle-note-2" onClick={() => selection.toggleNoteSelection('note-2')}>
        Toggle Note 2
      </button>
    </div>
  )
}

describe('useNoteSelection', () => {
  it('adds and removes note ids from selection', () => {
    cy.mount(<Harness />)

    cy.get('[data-cy="enter-selection"]').click()
    cy.get('[data-cy="toggle-note-1"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')
    cy.get('[data-cy="selectionMode"]').should('contain', 'true')

    cy.get('[data-cy="toggle-note-2"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '2')

    cy.get('[data-cy="toggle-note-1"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')
  })

  it('exitSelectionMode clears selection state', () => {
    cy.mount(<Harness />)

    cy.get('[data-cy="toggle-note-1"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')

    cy.get('[data-cy="exit-selection"]').click()
    cy.get('[data-cy="selectionMode"]').should('contain', 'false')
    cy.get('[data-cy="selectedCount"]').should('contain', '0')
  })
})
