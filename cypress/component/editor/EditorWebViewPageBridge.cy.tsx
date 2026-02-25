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

  it('emits HISTORY_STATE on each state transition and deduplicates only consecutive duplicates', () => {
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

    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([[false, false]])
    })

    // Change 1: typing enables undo.
    cy.get('.ProseMirror').type('A')
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })

    // Duplicate state: more typing keeps [true, false], should not append.
    cy.get('.ProseMirror').type('B')
    cy.wrap(null, { log: false }).should(() => {
      expect(readHistoryStates()).to.deep.equal([
        [false, false],
        [true, false],
      ])
    })

    // Change 2: undo must emit a new state (not a duplicate of [true, false]).
    cy.get('.ProseMirror').type('{ctrl}z')
    cy.wrap(null, { log: false }).should(() => {
      const states = readHistoryStates()
      expect(states).to.have.length(3)
      expect(states[0]).to.deep.equal([false, false])
      expect(states[1]).to.deep.equal([true, false])
      expect(states[2][1]).to.equal(true) // redo must become available after undo
    })

    // Change 3: redo returns to [true, false] and must be emitted again (non-consecutive repeat).
    cy.get('.ProseMirror').type('{ctrl}y')
    cy.wrap(null, { log: false }).should(() => {
      const states = readHistoryStates()
      expect(states).to.have.length(4)
      expect(states[0]).to.deep.equal([false, false])
      expect(states[1]).to.deep.equal([true, false])
      expect(states[3]).to.deep.equal([true, false])
    })
  })
})
