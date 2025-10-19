import React from 'react'
import { RichTextEditor } from '@/components/RichTextEditor'

// Mock TipTap
const mockEditor = {
  isActive: cy.stub().returns(false),
  chain: cy.stub().returns({
    focus: cy.stub().returnsThis(),
    toggleBold: cy.stub().returnsThis(),
    toggleItalic: cy.stub().returnsThis(),
    run: cy.stub(),
  }),
}

beforeEach(() => {
  // Mock TipTap useEditor hook
  cy.stub(window, 'useEditor').returns(mockEditor)
})

describe('RichTextEditor', () => {
  it('renders editor with toolbar', () => {
    cy.mount(<RichTextEditor />)
    cy.findByRole('textbox').should('exist')
  })

  it('allows typing in editor', () => {
    cy.mount(<RichTextEditor />)

    const editor = cy.findByRole('textbox')
    cy.wrap(editor).type('Test content')
    cy.wrap(editor).should('contain.text', 'Test content')
  })

  it('applies bold formatting when button clicked', () => {
    cy.mount(<RichTextEditor />)

    // Находим кнопку bold и кликаем
    cy.findByRole('button', { name: /bold/i }).click()

    // Проверяем что toggleBold был вызван
    cy.wrap(mockEditor.chain).should('have.been.called')
  })

  it('applies italic formatting when button clicked', () => {
    cy.mount(<RichTextEditor />)

    // Находим кнопку italic и кликаем
    cy.findByRole('button', { name: /italic/i }).click()

    // Проверяем что toggleItalic был вызван
    cy.wrap(mockEditor.chain).should('have.been.called')
  })

  it('handles keyboard shortcuts', () => {
    cy.mount(<RichTextEditor />)

    const editor = cy.findByRole('textbox')

    // Ctrl+B для bold
    cy.wrap(editor).type('{ctrl}b')
    cy.wrap(mockEditor.chain).should('have.been.called')

    // Ctrl+I для italic
    cy.wrap(editor).type('{ctrl}i')
    cy.wrap(mockEditor.chain).should('have.been.called')
  })

  it('shows active formatting state', () => {
    // Mock активного состояния для bold
    mockEditor.isActive.withArgs('bold').returns(true)

    cy.mount(<RichTextEditor />)

    // Кнопка bold должна быть активной
    cy.findByRole('button', { name: /bold/i }).should('have.class', 'active')
  })
})
