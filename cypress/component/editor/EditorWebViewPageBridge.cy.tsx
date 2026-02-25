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

    const extractHistoryStates = () => {
      const calls = nativePostMessage.getCalls()
      const states = calls
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

      return cy.wrap(states, { log: false })
    }

    // Initial state should be emitted exactly once.
    extractHistoryStates().then((states) => {
      expect(states).to.deep.equal([[false, false]])
    })

    // Focus-only transaction keeps same history state and must not emit duplicate.
    cy.get('.ProseMirror').click()
    extractHistoryStates().then((states) => {
      expect(states).to.deep.equal([[false, false]])
    })

    // First text input flips history to undo=true/redo=false and should emit once.
    cy.get('.ProseMirror').type('A')
    extractHistoryStates().then((states) => {
      expect(states).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })

    // More typing keeps same canUndo/canRedo and should not emit duplicate state.
    cy.get('.ProseMirror').type('B')
    extractHistoryStates().then((states) => {
      expect(states).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })
  })
})
