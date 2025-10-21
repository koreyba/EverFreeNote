# Component Testing Framework

Фреймворк для компонентных тестов на Cypress в проекте EverFreeNote.

## Обзор

Этот фреймворк предоставляет структурированный подход к тестированию React компонентов с использованием Cypress Component Testing. Фреймворк включает:

- Организацию тестов по функциональным областям (areas)
- Готовые утилиты и хелперы
- Mock данные и fixtures
- Инструменты для code coverage
- Лучшие практики и паттерны

## Структура

```
cypress/component/
├── auth/           # Тесты аутентификации
├── editor/         # Тесты редактирования
├── ui/             # Общие UI компоненты
├── README.md       # Эта документация
└── ...

cypress/fixtures/component/
├── users.json      # Пользовательские данные
├── notes.json      # Данные заметок
├── ui-states.json  # UI состояния
├── api-responses.json # Mock API ответы
└── mocks.js        # Готовые конфигурации mocks

cypress/support/
├── component.js    # Основная конфигурация
└── component-utils.js # Пользовательские утилиты
```

## Быстрый старт

### 1. Создание нового теста

```javascript
import React from 'react'
import { Button } from '../../../components/ui/button'

describe('Button Component', () => {
  it('renders with default props', () => {
    cy.mount(<Button>Click me</Button>)
    cy.get('button').should('be.visible').and('contain', 'Click me')
  })
})
```

### 2. Использование утилит

```javascript
import React from 'react'
import { RichTextEditor } from '../../../components/RichTextEditor'

describe('RichTextEditor Component', () => {
  it('allows typing and formatting', () => {
    cy.mount(<RichTextEditor />)

    // Используем утилиты для взаимодействия
    cy.typeInEditor('Hello World')
    cy.shouldHaveEditorContent('Hello World')

    // Применяем форматирование
    cy.get('[data-cy="editor"]').type('{selectall}')
    cy.formatTextInEditor('bold')
  })
})
```

### 3. Работа с mocks

```javascript
import React from 'react'
import { NoteList } from '../../../components/NoteList'
import { mockPresets } from '../../fixtures/component/mocks'

describe('NoteList Component', () => {
  it('displays notes from API', () => {
    // Применяем готовый набор mocks
    mockPresets.apply(cy, 'notesList')

    cy.mount(<NoteList />)
    cy.get('[data-cy="note-item"]').should('have.length', 2)
  })
})
```

## Запуск тестов

### Все компонентные тесты
```bash
npm run test:component
```

### Тесты конкретной области
```bash
# Только аутентификация
npm run test:component -- --spec 'cypress/component/auth/**/*.cy.js'

# Только редактор
npm run test:component -- --spec 'cypress/component/editor/**/*.cy.js'

# Только UI компоненты
npm run test:component -- --spec 'cypress/component/ui/**/*.cy.js'
```

### С code coverage
```bash
npm run test:component:coverage
```

### В режиме разработки (watch)
```bash
npm run test:component:watch
```

## Утилиты и хелперы

### Mount утилиты

```javascript
// Базовый mount
cy.mount(<MyComponent />)

// Mount с провайдерами и mocks
cy.mountWithProviders(<MyComponent />, {
  providers: [ThemeProvider, QueryProvider],
  mocks: { api: { getData: { data: 'mocked' } } },
  fixtures: { user: 'component/users.json' }
})
```

### Mock утилиты

```javascript
// Настройка одиночного mock
cy.mockService('supabase', {
  method: 'select',
  response: { data: [] }
})

// Настройка нескольких mocks
cy.setupMocks({
  supabase: {
    from: { select: { data: [] } }
  }
})
```

### Assertion helpers

```javascript
// Проверки состояния кнопок
cy.shouldHaveButtonState('[data-cy="submit"]', 'enabled')
cy.shouldHaveButtonState('[data-cy="loading"]', 'loading')

// Проверки контента редактора
cy.shouldHaveEditorContent('Expected text')

// Проверки видимости
cy.shouldBeVisible('[data-cy="modal"]')
cy.shouldNotBeVisible('[data-cy="error"]')

// Проверки ошибок
cy.shouldShowError('Something went wrong')
```

### Генераторы тестовых данных

```javascript
// Генерация тестового пользователя
const user = cy.generateTestUser({ name: 'Custom User' })

// Генерация тестовой заметки
const note = cy.generateTestNote({ title: 'Custom Title' })
```

## Лучшие практики

### 1. Организация тестов

- Группируйте тесты по функциональным областям (auth, editor, ui)
- Используйте описательные названия тестов
- Следуйте паттерну: Arrange → Act → Assert

### 2. Работа с асинхронностью

```javascript
it('handles async operations', () => {
  cy.mount(<AsyncComponent />)
  cy.waitForAsync(1000) // Ждем завершения операций
  cy.get('[data-cy="result"]').should('be.visible')
})
```

### 3. Тестирование ошибок

```javascript
it('shows error state', () => {
  cy.mockService('api', { error: true })
  cy.mount(<DataComponent />)
  cy.shouldShowError('Failed to load data')
})
```

### 4. Использование fixtures

```javascript
beforeEach(() => {
  cy.fixture('component/users').as('users')
  cy.fixture('component/notes').as('notes')
})

it('works with fixture data', function() {
  cy.mount(<UserProfile user={this.users.authenticatedUser} />)
})
```

## Code Coverage

Фреймворк настроен для сбора code coverage. Отчеты генерируются автоматически:

```bash
npm run test:component:coverage
```

Отчеты сохраняются в `coverage/component/` и включают:
- HTML отчет для просмотра в браузере
- JSON данные для CI/CD интеграции
- Текстовый summary

## Отладка

### Интерактивный режим
```bash
npm run test:component:watch
```
Открывает Cypress Test Runner для интерактивного запуска и отладки тестов.

### Логи и скриншоты
При падении тестов автоматически создаются:
- Скриншоты состояния компонента
- Видео записи (если включено)
- Детальные логи ошибок

## Расширение фреймворка

### Добавление новых утилит

Добавьте функции в `cypress/support/component-utils.js`:

```javascript
Cypress.Commands.add('newUtility', (param) => {
  // Ваша логика
})
```

### Создание новых fixtures

Создайте JSON файлы в `cypress/fixtures/component/` и обновите `mocks.js` для их использования.

### Добавление областей (areas)

1. Создайте папку `cypress/component/new-area/`
2. Добавьте `README.md` с описанием компонентов
3. Обновите документацию

## Troubleshooting

### Тесты не запускаются
- Проверьте конфигурацию в `cypress.config.js`
- Убедитесь что файлы имеют расширение `.cy.js`
- Проверьте корректность импортов компонентов

### Mocks не работают
- Проверьте что mock применяется перед mount
- Используйте `cy.window().then()` для отладки
- Проверьте правильность структуры mock объектов

### Code coverage не собирается
- Убедитесь что `@cypress/code-coverage` установлен
- Проверьте конфигурацию coverage в `cypress.config.js`
- Проверьте что тестируемый код импортируется правильно

## Ресурсы

- [Cypress Component Testing](https://docs.cypress.io/guides/component-testing/overview)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
