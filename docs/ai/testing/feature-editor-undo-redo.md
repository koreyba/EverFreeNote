---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy — Editor Undo/Redo Controls

## Test Coverage Goals
- Unit tests: 100% новых/изменённых компонентов
- Integration: undo/redo через WebView bridge
- E2E: ключевые пользовательские сценарии
- Manual: визуальный контроль на реальных устройствах

## Unit Tests

### MenuBar (RichTextEditor.tsx)
- [ ] Кнопки Undo и Redo рендерятся в начале тулбара
- [ ] Кнопка Undo вызывает `editor.chain().focus().undo().run()` по клику
- [ ] Кнопка Redo вызывает `editor.chain().focus().redo().run()` по клику
- [ ] Кнопка Undo задизаблена, когда `editor.can().undo()` = false
- [ ] Кнопка Redo задизаблена, когда `editor.can().redo()` = false
- [ ] Tooltip Undo показывает "Undo (Ctrl+Z)"
- [ ] Tooltip Redo показывает "Redo (Ctrl+Shift+Z)"

### note/[id].tsx (мобайл)
- [ ] `Stack.Screen title` равен '' (пустая строка, не 'Edit')
- [ ] `headerLeft` содержит кнопки Undo2 и Redo2
- [ ] Кнопка Undo2 вызывает `editorRef.current?.runCommand('undo')`
- [ ] Кнопка Redo2 вызывает `editorRef.current?.runCommand('redo')`
- [ ] Кнопка "назад" вызывает `router.back()`

## Integration Tests
- [ ] Undo отменяет последнее изменение текста в редакторе (веб)
- [ ] Redo повторяет отменённое изменение (веб)
- [ ] Последовательность: ввод текста → Undo → Redo восстанавливает текст (веб)
- [ ] Undo через WebView bridge: команда доходит до TipTap (мобайл)
- [ ] Redo через WebView bridge: команда доходит до TipTap (мобайл)

## End-to-End Tests
- [ ] Веб: пользователь набирает текст → кликает Undo → текст исчезает
- [ ] Веб: кликает Redo → текст возвращается
- [ ] Веб mobile viewport: тулбар скроллится, Undo/Redo доступны первыми
- [ ] Мобайл: открывает заметку → нажимает Undo в шапке → изменение отменяется

## Test Data
- Простой текст: "Hello World" — для базового undo/redo
- Форматирование: жирный текст — проверка отмены форматирования
- Пустой редактор — проверка disabled-state (Undo недоступен)

## Test Reporting & Coverage
- Запуск: `npm run test -- --coverage` (веб), `npm run test` (мобайл)
- Покрытие: 100% новых строк в `RichTextEditor.tsx` и `note/[id].tsx`

## Manual Testing
**Чеклист для ручного тестирования:**

### Веб Desktop
- [ ] Кнопки Undo/Redo видны в тулбаре (самые первые)
- [ ] Undo задизаблен при открытии новой заметки
- [ ] После ввода текста Undo становится активным
- [ ] Ctrl+Z и кнопка Undo дают одинаковый результат
- [ ] Ctrl+Shift+Z и кнопка Redo дают одинаковый результат

### Веб Mobile Viewport (DevTools)
- [ ] Тулбар показывает Undo/Redo первыми на всех breakpoints
- [ ] Кнопки нажимаемы на тач-экране (размер >= 44px)

### Мобайл-нейтив Android
- [ ] Шапка: нет надписи "Edit"
- [ ] Шапка: кнопка ← (назад) + ↩ (undo) + ↪ (redo)
- [ ] Нажатие ↩ отменяет последний ввод
- [ ] Нажатие ↪ повторяет отменённый ввод
- [ ] Кнопка ← возвращает к списку заметок

### Мобайл-нейтив iOS
- [ ] Те же проверки, что для Android

## Performance Testing
- Undo/Redo должны отрабатывать мгновенно (< 50ms) — проверить в DevTools Performance.

## Bug Tracking
- Приоритет багов: P1 — undo/redo не работает; P2 — неверный disabled-state; P3 — визуальные проблемы.

## 2026-02-25 Mobile Undo/Redo Regression Coverage
- Added integration tests for mobile header undo/redo disabled state driven by history (`canUndo/canRedo`).
- Added component tests for `HISTORY_STATE` message handling in `EditorWebView`.
- Added Cypress component regression test for `RichTextEditorWebView`: first undo after `setContent` must not clear baseline content.

### Execution status
- `npm --prefix ui/mobile test -- noteEditorUndoRedo.test.tsx editorWebViewMessages.test.tsx` passed.
- Cypress component run in this environment failed before test output with native process exit `-1073741795`; spec execution could not be verified here.

## 2026-02-26 Web Note Switch History Reset Coverage

### Added component test
- File: `cypress/component/features/notes/NoteEditor.cy.tsx`
- Scenario: switch between two existing notes (A -> B) after creating undo history in note A.
- Assertions:
  - Before switch: undo becomes enabled after editing note A.
  - After switch: title/content from note B are rendered.
  - After switch: undo and redo are both disabled (fresh history for note B).
  - After switch: content typed in note A is not present in note B.

### Why this test matters
- It protects the architectural rule: history reset is guaranteed by note-session remount boundaries, not by in-place editor mutation.

## 2026-02-26 Mobile Same-Note Refresh Regression Coverage

### Added integration test
- File: `ui/mobile/tests/integration/noteEditorUndoRedo.test.tsx`
- Scenario: undo is enabled, then the same note is refreshed in query cache (`['note', 'note-id']` with unchanged id).
- Assertion: undo remains enabled after refresh.

### Why this test matters
- It protects against a mobile-specific regression where autosave/refetch of the same note incorrectly reset header history state to disabled.
- It verifies that history UI reset is tied to note identity change, not to any note object refresh.

## 2026-02-26 Additional Regression Scenarios

### Added mobile integration scenario
- File: `ui/mobile/tests/integration/noteEditorUndoRedo.test.tsx`
- Scenario: route switches from note A to note B.
- Assertions:
  - Before switch: undo/redo can be enabled by history events.
  - After switch: header undo/redo are reset to disabled.

### Added bridge component scenario
- File: `cypress/component/editor/EditorWebViewPageBridge.cy.tsx`
- Scenario: `HISTORY_STATE` transitions across type/undo/redo.
- Assertions:
  - Consecutive duplicates are deduplicated.
  - Real state transitions are emitted.
  - A non-consecutive repeated state (e.g. back to `[true, false]`) is emitted again.
