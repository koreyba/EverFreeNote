# Editor Component Tests

Тесты для компонентов редактирования текста и контента.

## Компоненты в этой области:

### Core Editor Components
- **RichTextEditor** - полнофункциональный WYSIWYG редактор с поддержкой:
  - Форматирования текста (bold, italic, underline, strikethrough)
  - Заголовков (H1, H2, H3)
  - Списков (bullet, numbered, task lists)
  - Выравнивания текста
  - Цветов и выделения
  - Ссылок и изображений
  - Superscript/Subscript

### Supporting Components
- **Textarea** - многострочный текстовый ввод
- **Input** - однострочный текстовый ввод
- **Form** - компоненты форм для создания/редактирования заметок
- **InteractiveTag** - интерактивные теги для категоризации заметок

### Related Hooks
- **useNotesMutations** - хуки для создания, обновления, удаления заметок
- **useNotesQuery** - хуки для получения и поиска заметок

## Тестовое покрытие

**Целевое покрытие: 100%** для всех компонентов редактирования

### Приоритеты тестирования:
1. **RichTextEditor** - основной компонент (высокий приоритет)
2. **Textarea/Input** - базовые контроллы ввода
3. **Form components** - формы создания/редактирования
4. **InteractiveTag** - работа с тегами

## Запуск тестов:
```bash
npm run test:component -- --spec 'cypress/component/editor/**/*.cy.js'
```

## Структура тестов:
```
cypress/component/editor/
├── RichTextEditor.cy.js     # Основной редактор
├── Textarea.cy.js          # Текстовые поля
├── Input.cy.js             # Поля ввода
├── Form.cy.js              # Формы
├── InteractiveTag.cy.js    # Теги
└── README.md
```
