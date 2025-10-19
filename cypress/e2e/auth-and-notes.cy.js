describe('Authentication and Notes Page', () => {
  beforeEach(() => {
    // Очистка состояния перед каждым тестом
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should allow skip authentication and show notes page', () => {
    // Посещаем главную страницу
    cy.visit('/')

    // Проверяем наличие элементов аутентификации
    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('Continue with Google').should('be.visible')
    cy.contains('Skip Authentication').should('be.visible')

    // Нажимаем на skip authentication
    cy.contains('Skip Authentication').click()

    // Проверяем что перешли на страницу с заметками
    cy.url().should('include', '/')

    // Проверяем наличие элементов управления заметками
    cy.contains('New Note').should('be.visible')
    cy.get('input[placeholder="Search notes..."]').should('be.visible')

    // Проверяем что пользователь авторизован (виден индикатор пользователя)
    cy.get('body').should('contain', 'skip-auth@example.com')

    // Проверяем наличие сообщения о пустом списке заметок
    cy.contains('No notes yet').should('be.visible')
    cy.contains('Create your first note to get started!').should('be.visible')
  })
})
