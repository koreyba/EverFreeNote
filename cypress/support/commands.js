// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

// Custom command for authentication
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password') => {
  cy.session([email, password], () => {
    cy.visit('/')
    cy.contains('Skip Authentication').click()
  })
})

// Custom command for creating a note
Cypress.Commands.add('createNote', (title, content = '') => {
  cy.contains('New Note').click()
  cy.get('input[placeholder="Note title"]').type(title)
  if (content) {
    cy.get('.ql-editor').type(content)
  }
  cy.contains('Save').click()
  cy.contains('Note created successfully').should('be.visible')
})

// For component testing
import { mount } from 'cypress/react18'

Cypress.Commands.add('mount', mount)

// Custom command for rich text editor testing
Cypress.Commands.add('typeInRichEditor', (content) => {
  cy.get('.ql-editor').clear().type(content)
})

Cypress.Commands.add('applyRichTextFormatting', (buttonText) => {
  cy.contains('button', buttonText).click()
})

Cypress.Commands.add('selectTextInEditor', (startOffset, endOffset) => {
  cy.get('.ql-editor').then($editor => {
    const editor = $editor[0]
    const range = document.createRange()
    const textNode = editor.firstChild

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, startOffset)
      range.setEnd(textNode, endOffset)

      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
})
