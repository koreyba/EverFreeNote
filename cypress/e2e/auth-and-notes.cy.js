describe('EverFreeNote Application', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should handle authentication flow and UI elements', () => {
    // Проверяем экран аутентификации
    cy.visit('/')
    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('Continue with Google').should('be.visible')
    cy.contains('Skip Authentication').should('be.visible')

    // Аутентифицируемся
    cy.contains('Skip Authentication').click()

    // Проверяем основной интерфейс приложения
    cy.contains('New Note').should('be.visible')
    cy.get('input[placeholder*="Search"]').should('be.visible')
    cy.contains('skip-auth@example.com').should('be.visible')
    cy.contains('No notes yet').should('be.visible')

    // Выходим из системы
    cy.get('svg.lucide-log-out').parent('button').click()
    cy.contains('EverFreeNote').should('be.visible')
  })

  it('should create, display and edit notes with rich text', () => {
    // Аутентифицируемся
    cy.visit('/')
    cy.contains('Skip Authentication').click()

    // Создаем заметку с rich text форматированием
    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('My Rich Text Note')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Normal text ')

    // Применяем форматирование
    cy.get('[data-cy="editor-content"]').type('{selectall}')
    cy.get('[data-cy="bold-button"]').click()

    // Добавляем еще текста
    cy.get('[data-cy="editor-content"]').type('{movetoend}')
    cy.get('[data-cy="editor-content"]').type(' and italic text')
    cy.get('[data-cy="editor-content"]').type('{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}')
    cy.get('[data-cy="editor-content"]').type('{shift}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}')
    cy.get('[data-cy="italic-button"]').click()

    cy.get('input[placeholder="work, personal, ideas"]').type('test, rich-text')

    // Сохраняем заметку
    cy.contains('Save').click()
    cy.contains('Note created successfully').should('be.visible')

    // Проверяем отображение заметки
    cy.contains('My Rich Text Note').should('be.visible')
    cy.contains('test').should('be.visible')

    // Кликаем на заметку для просмотра деталей
    cy.contains('My Rich Text Note').click()
    cy.contains('My Rich Text Note').should('be.visible')

    // Редактируем заметку
    cy.contains('Edit').click()
    cy.get('input[placeholder="Note title"]').clear().type('Updated Rich Text Note')
    cy.get('input[placeholder="work, personal, ideas"]').clear().type('updated, test')

    // Сохраняем изменения
    cy.contains('Save').click()
    cy.contains('Note updated successfully').should('be.visible')

    // Проверяем обновления
    cy.contains('Updated Rich Text Note').should('be.visible')
    cy.contains('updated').should('be.visible')
  })

  it('should handle multiple notes and search functionality', () => {
    // Аутентифицируемся
    cy.visit('/')
    cy.contains('Skip Authentication').click()

    // Создаем первую заметку
    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('JavaScript Guide')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Learn JavaScript basics')
    cy.contains('Save').click()
    cy.contains('Note created successfully').should('be.visible')
    cy.wait(1000)

    // Создаем вторую заметку
    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('Python Tutorial')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Python programming tutorial')
    cy.contains('Save').click()
    cy.contains('Note created successfully').should('be.visible')
    cy.wait(1000)

    // Создаем третью заметку
    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('React Components')
    cy.get('[data-cy="editor-content"]').click()
    cy.get('[data-cy="editor-content"]').type('Building reusable React components')
    cy.contains('Save').click()
    cy.contains('Note created successfully').should('be.visible')
    cy.wait(1000)

    // Проверяем что все заметки отображаются
    cy.contains('JavaScript Guide').should('be.visible')
    cy.contains('Python Tutorial').should('be.visible')
    cy.contains('React Components').should('be.visible')

    // Ищем по JavaScript
    cy.get('input[placeholder*="Search"]').type('JavaScript')
    cy.contains('JavaScript Guide').should('be.visible')
    cy.contains('Python Tutorial').should('not.exist')
    cy.contains('React Components').should('not.exist')

    // Очищаем поиск
    cy.get('input[placeholder*="Search"]').clear()

    // Проверяем что все заметки снова отображаются
    cy.contains('JavaScript Guide').should('be.visible')
    cy.contains('Python Tutorial').should('be.visible')
    cy.contains('React Components').should('be.visible')

    // Ищем по "programming"
    cy.get('input[placeholder*="Search"]').type('programming')
    cy.contains('Python Tutorial').should('be.visible')
    cy.contains('JavaScript Guide').should('not.exist')
    cy.contains('React Components').should('not.exist')
  })
})
