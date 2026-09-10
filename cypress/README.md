# 🧪 Тестирование EverFreeNote (Cypress Only)

Проект использует **Cypress** для всех уровней тестирования - от компонентных тестов до E2E сценариев.

**Тесты удалены, фреймворк настроен и готов к разработке новых тестов.**

## 🧩 Компонентное тестирование (Component Testing)
Тестирование отдельных React компонентов в изоляции.

### Запуск:
```bash
# Открыть Cypress UI для component тестов
npm run cypress

# Запустить все component тесты
npm run test:component
```

### Структура:
```
cypress/
├── component/                 # Component тесты (папка пустая)
├── fixtures/                  # Тестовые данные
└── support/
    ├── component.js           # Настройки для component testing
    └── commands.ts            # Кастомные команды
```

## 🌐 E2E тестирование (End-to-End)
Тестирование полного пользовательского опыта в браузере.

### Запуск:
```bash
# Открыть Cypress UI для E2E тестов
npm run cypress

# Запустить все E2E тесты
npm run test:e2e

# Запустить ВСЕ тесты
npm run test:all
```

### Структура:
```
cypress/
├── e2e/                      # E2E тест файлы
│   └── auth-and-notes.cy.js # Базовый тест аутентификации и заметок
├── fixtures/                # Тестовые данные
└── support/
    ├── e2e.js              # E2E настройки
    └── commands.ts         # Кастомные команды
```

## 🔎 Селекторы: `data-cy`, а не классы иконок

Цепляйтесь за `data-cy` (для кнопок и других управляющих элементов) или
`data-testid` (для контейнеров и регионов). Не используйте:

- **CSS-классы библиотеки иконок** (`.lucide-chevron-left`, `svg.lucide-tag`).
  Их генерирует библиотека, и при смене набора иконок все такие тесты падают
  разом — ровно это и случилось при переходе с Lucide на Phosphor.
- **Видимый текст кнопки** (`cy.contains('Save')`) там, где подпись скрывается
  на части брейкпоинтов. Такой селектор молча перестаёт находить элемент, а
  Allure при этом падает с `RangeError: Invalid string length` вместо
  внятного сообщения об ассерте.

`aria-label` как селектор допустим, но это пользовательский текст — он меняется
вместе с копирайтом и локализацией, поэтому для новых тестов предпочтительнее
`data-cy`.

## 🎯 Кастомные команды Cypress

```javascript
// Аутентификация
cy.login() // Быстрый логин через skip auth

// Работа с заметками
cy.createNote('Заголовок', 'Содержимое') // Создание заметки

// Rich text editor
cy.typeInRichEditor('текст') // Ввод текста
cy.applyRichTextFormatting('B') // Применение форматирования
cy.selectTextInEditor(0, 5) // Выделение текста

// Component testing
cy.mount(<Component />) // Монтирование компонента для тестирования
cy.mockSupabase() // Мок Supabase клиента
```

## ⚙️ Конфигурация

### Cypress (`cypress.config.ts`):
```javascript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
  },
})
```

## 📊 Следующие шаги

### 🔄 Что настроено:
- ✅ Cypress для component testing
- ✅ Cypress для E2E testing
- ✅ Структура папок для обоих типов
- ✅ Базовые конфигурации и примеры
- ✅ Кастомные команды

### 🎯 Что добавить:

#### Component тесты:
```javascript
// cypress/component/RichTextEditor.cy.tsx
import { RichTextEditor } from '@/components/RichTextEditor'

describe('RichTextEditor', () => {
  it('renders with toolbar', () => {
    cy.mount(<RichTextEditor />)
    cy.findByRole('textbox').should('exist')
  })

  it('applies formatting', () => {
    cy.mount(<RichTextEditor />)
    cy.findByRole('button', { name: /bold/i }).click()
    // Проверка применения форматирования
  })
})
```

#### E2E тесты для rich text функциональности:
```javascript
// cypress/e2e/rich-text-editor.cy.js
describe('Rich Text Editor E2E', () => {
  it('supports full editing workflow', () => {
    cy.login()
    cy.createNote('Test', 'normal text')

    // Выделить текст и применить форматирование
    cy.selectTextInEditor(0, 6)
    cy.applyRichTextFormatting('B')

    // Сохранить и проверить
    cy.contains('Save').click()
    cy.contains('normal text').should('have.css', 'font-weight', 'bold')
  })
})
```

## 🚦 Статус тестирования

| Функциональность | Component тесты | E2E тесты | Статус |
|------------------|-----------------|-----------|---------|
| Базовая настройка | ✅ | ✅ | Готово |
| Аутентификация | ❌ | ✅ | Реализовано (skip auth) |
| Создание заметок | ❌ | ❌ | Запланировано |
| Rich Text Editor | ❌ | ❌ | Запланировано |
| Поиск | ❌ | ❌ | Запланировано |
| API интеграция | ❌ | ❌ | Запланировано |

### 📋 **Существующие тесты:**
- **`auth-and-notes.cy.js`** - Базовый E2E тест аутентификации и проверки страницы заметок

## 🛠️ Разработка и отладка

### Запуск конкретных тестов:
```bash
# Component тест конкретного компонента
npm run cypress:run -- --component --spec "cypress/component/RichTextEditor.cy.tsx"

# E2E тест конкретного сценария
npm run cypress:run -- --spec "cypress/e2e/basic.cy.js"
```

### Интерактивная разработка:
```bash
# Cypress UI - переключайтесь между E2E и Component
npm run cypress
```

## 🎉 Результат

**Тестирование унифицировано на Cypress!** Теперь у вас есть:
- ⚡ Component тесты для отдельных компонентов
- 🌐 E2E тесты для пользовательских сценариев
- 🔧 Один инструмент для всего тестирования
- 📈 Лучшая интеграция с браузером

**Следующий шаг:** Разработать component тесты для RichTextEditor и расширить E2E покрытие для rich text функциональности.
