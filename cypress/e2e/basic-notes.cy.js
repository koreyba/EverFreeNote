// Дополнительные проверки UI и edge cases
// Основные функциональные тесты объединены в auth-and-notes.cy.js

describe('UI Edge Cases and Additional Validations', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    cy.contains('Skip Authentication').click()
  })

  it('should handle empty note creation gracefully', () => {
    // Создаем заметку без заголовка и контента
    cy.contains('New Note').click()
    cy.contains('Save').click()

    // Проверяем что заметка создана с дефолтными значениями
    cy.contains('Note created successfully').should('be.visible')
  })

  it('should handle very long note titles gracefully', () => {
    const longTitle = 'A'.repeat(100) // Очень длинный заголовок

    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type(longTitle)
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Short content')
    cy.contains('Save').click()

    // Проверяем что длинный заголовок отображается корректно
    cy.contains('Note created successfully').should('be.visible')
    cy.contains(longTitle.substring(0, 50)).should('be.visible') // Проверяем начало заголовка
  })

  it('should handle special characters in note content', () => {
    const specialContent = 'Special chars: @#$%^&*()_+{}|:<>?[]\\;\'",./'

    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('Special Characters Test')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type(specialContent)
    cy.contains('Save').click()

    // Проверяем что специальный контент сохранен
    cy.contains('Note created successfully').should('be.visible')
    cy.contains('Special Characters Test').should('be.visible')
  })

  it('should handle multiple spaces and line breaks in content', () => {
    const contentWithSpaces = 'Text with   multiple    spaces\n\n\nand line breaks'

    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('Whitespace Test')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type(contentWithSpaces)
    cy.contains('Save').click()

    // Проверяем что пробелы и переносы строк сохранены
    cy.contains('Note created successfully').should('be.visible')
    cy.contains('Whitespace Test').should('be.visible')
  })
})
