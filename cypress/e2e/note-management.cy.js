describe('Note Management', () => {
  beforeEach(() => {
    // Очистка состояния перед каждым тестом
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should create and display a new note', () => {
    cy.visit('/')
    cy.login()

    // Создание новой заметки
    cy.createNote('Test Note Title', 'This is test content for the note.')

    // Проверка что заметка появилась в списке
    cy.contains('Test Note Title').should('be.visible')
    cy.contains('This is test content').should('be.visible')
  })

  it('should edit existing note', () => {
    cy.visit('/')
    cy.login()
    cy.createNote('Original Title', 'Original content')

    // Редактирование заметки
    cy.contains('Original Title').click()
    cy.contains('Edit').click()

    cy.get('input[placeholder="Note title"]').clear().type('Updated Title')
    cy.get('.ql-editor').clear().type('Updated content')

    cy.contains('Save').click()

    // Проверка обновления
    cy.contains('Updated Title').should('be.visible')
    cy.contains('Updated content').should('be.visible')
  })

  it('should test rich text editor formatting', () => {
    cy.visit('/')
    cy.login()

    cy.contains('New Note').click()
    cy.get('input[placeholder="Note title"]').type('Rich Text Test')

    // Тестирование форматирования текста
    cy.get('.ql-editor').type('Normal text')

    // Выделение текста и применение форматирования
    cy.selectTextInEditor(0, 6) // Выделить "Normal"
    cy.applyRichTextFormatting('B') // Bold

    cy.get('.ql-editor').type('{end} ') // Перейти в конец

    cy.selectTextInEditor(7, 11) // Выделить "text"
    cy.applyRichTextFormatting('I') // Italic

    cy.contains('Save').click()

    // Проверка что форматирование сохранилось
    cy.contains('Normal text').should('be.visible')
  })

  it('should handle search functionality', () => {
    cy.visit('/')
    cy.login()

    // Создание нескольких заметок
    cy.createNote('Work Meeting', 'Discussion about project')
    cy.createNote('Personal Reminder', 'Buy groceries')

    // Тестирование поиска
    cy.get('input[placeholder="Search notes..."]').type('Work')

    // Должна остаться только заметка с "Work"
    cy.contains('Work Meeting').should('be.visible')
    cy.contains('Personal Reminder').should('not.exist')
  })

  it('should delete note with confirmation', () => {
    cy.visit('/')
    cy.login()
    cy.createNote('Note to Delete', 'This will be deleted')

    // Удаление заметки
    cy.contains('Note to Delete').click()
    cy.contains('Delete').click()

    // Подтверждение удаления
    cy.contains('Delete').click()

    // Проверка что заметка исчезла
    cy.contains('Note to Delete').should('not.exist')
  })
})
