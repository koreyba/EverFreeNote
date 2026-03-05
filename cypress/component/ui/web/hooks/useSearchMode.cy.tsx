import React from 'react'
import { useSearchMode } from '../../../../../ui/web/hooks/useSearchMode'

const STORAGE_KEY = 'everfreenote:aiSearchMode'

const SearchModeHarness = () => {
  const { isAIEnabled, preset, viewMode, setIsAIEnabled, setPreset, setViewMode } = useSearchMode()

  return (
    <div>
      <div data-cy="enabled">{String(isAIEnabled)}</div>
      <div data-cy="preset">{preset}</div>
      <div data-cy="view">{viewMode}</div>
      <button type="button" data-cy="enable" onClick={() => setIsAIEnabled(true)}>
        Enable
      </button>
      <button type="button" data-cy="preset-broad" onClick={() => setPreset('broad')}>
        Broad
      </button>
      <button type="button" data-cy="view-chunk" onClick={() => setViewMode('chunk')}>
        Chunk
      </button>
    </div>
  )
}

describe('useSearchMode', () => {
  beforeEach(() => {
    cy.window().then((win) => win.localStorage.removeItem(STORAGE_KEY))
  })

  it('starts with defaults and persists updates', () => {
    cy.mount(<SearchModeHarness />)

    cy.get('[data-cy="enabled"]').should('contain', 'false')
    cy.get('[data-cy="preset"]').should('contain', 'neutral')
    cy.get('[data-cy="view"]').should('contain', 'note')

    cy.get('[data-cy="enable"]').click()
    cy.get('[data-cy="preset-broad"]').click()
    cy.get('[data-cy="view-chunk"]').click()

    cy.window().then((win) => {
      const raw = win.localStorage.getItem(STORAGE_KEY)
      expect(raw).to.not.equal(null)
      const parsed = JSON.parse(raw || '{}') as {
        isAIEnabled?: boolean
        preset?: string
        viewMode?: string
      }
      expect(parsed.isAIEnabled).to.equal(true)
      expect(parsed.preset).to.equal('broad')
      expect(parsed.viewMode).to.equal('chunk')
    })
  })

  it('restores state from localStorage', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ isAIEnabled: true, preset: 'strict', viewMode: 'chunk' })
      )
    })

    cy.mount(<SearchModeHarness />)

    cy.get('[data-cy="enabled"]').should('contain', 'true')
    cy.get('[data-cy="preset"]').should('contain', 'strict')
    cy.get('[data-cy="view"]').should('contain', 'chunk')
  })
})
