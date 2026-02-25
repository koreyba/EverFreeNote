import React from 'react'
import EditorWebViewPage from '../../../app/editor-webview/page'

describe('EditorWebViewPage bridge', () => {
  it('deduplicates HISTORY_STATE messages sent to React Native', () => {
    const nativePostMessage = cy.stub().as('nativePostMessage')

    cy.window().then((win) => {
      ;(win as unknown as { ReactNativeWebView?: { postMessage: (msg: string) => void } }).ReactNativeWebView = {
        postMessage: nativePostMessage,
      }
    })

    cy.mount(<EditorWebViewPage />)
    cy.get('.ProseMirror').should('exist')

    const readHistoryStates = () => {
      const calls = nativePostMessage.getCalls()
      return calls
        .map((call) => {
          try {
            return JSON.parse(String(call.args[0]))
          } catch {
            return null
          }
        })
        .filter((message): message is { type: string; payload: { canUndo: boolean; canRedo: boolean } } =>
          Boolean(message && message.type === 'HISTORY_STATE')
        )
        .map((message) => [Boolean(message.payload.canUndo), Boolean(message.payload.canRedo)] as [boolean, boolean])
    }

    // Initial state should be emitted exactly once.
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([[false, false]])
    })

    // Focus-only transaction keeps same history state and must not emit duplicate.
    cy.get('.ProseMirror').click()
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([[false, false]])
    })

    // First text input flips history to undo=true/redo=false and should emit once.
    cy.get('.ProseMirror').type('A')
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })

    // More typing keeps same canUndo/canRedo and should not emit duplicate state.
    cy.get('.ProseMirror').type('B')
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })
  })
})
