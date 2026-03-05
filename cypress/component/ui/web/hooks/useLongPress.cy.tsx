import React from 'react'
import { useLongPress } from '../../../../../ui/web/hooks/useLongPress'

const LongPressHarness = ({
  delayMs = 500,
  moveThresholdPx = 10,
}: {
  delayMs?: number
  moveThresholdPx?: number
}) => {
  const [count, setCount] = React.useState(0)
  const { longPressHandlers } = useLongPress(
    () => setCount((prev) => prev + 1),
    { delayMs, moveThresholdPx }
  )

  return (
    <div>
      <div data-cy="count">{count}</div>
      <div
        data-cy="target"
        style={{ width: 160, height: 80, background: '#ddd' }}
        {...longPressHandlers}
      />
    </div>
  )
}

describe('useLongPress', () => {
  it('fires callback after long press delay', () => {
    cy.clock()

    cy.mount(<LongPressHarness delayMs={400} />)

    cy.get('[data-cy="target"]').trigger('pointerdown', {
      pointerType: 'touch',
      clientX: 20,
      clientY: 20,
    })
    cy.tick(450)
    cy.get('[data-cy="count"]').should('contain', '1')
  })

  it('cancels long press when pointer moves beyond threshold', () => {
    cy.clock()

    cy.mount(<LongPressHarness delayMs={400} moveThresholdPx={5} />)

    cy.get('[data-cy="target"]').trigger('pointerdown', {
      pointerType: 'touch',
      clientX: 20,
      clientY: 20,
    })
    cy.get('[data-cy="target"]').trigger('pointermove', {
      pointerType: 'touch',
      clientX: 40,
      clientY: 20,
    })
    cy.tick(450)
    cy.get('[data-cy="count"]').should('contain', '0')
  })
})
