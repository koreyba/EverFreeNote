---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit: 100% новых/изменённых selection/deletion компонентов/хендлеров.
- Integration: выбор + delete flow, ошибки delete, поиск/теги + selection.
- E2E: мобильный/десктоп флоу выбора и удаления.
- Все критерии из требований покрыты тестами.

## Unit Tests
**What individual components need testing?**

- `useNoteAppController` selection handlers:
  - [ ] toggleNoteSelection adds/removes id
  - [ ] selectAll/clearSelection working with provided ids
  - [ ] deleteSelected calls delete mutation per id and clears selection
- `NoteList/NoteCard` render:
  - [ ] Чекбоксы видимы в selection mode
  - [ ] Клик по карточке/чекбоксу триггерит onToggle
- `BulkDeleteModal`:
  - [ ] Кнопка Delete disabled until input matches count
  - [ ] Shows count and blocks non-numeric/incorrect input

## Integration Tests
**How do we test component interactions?**

- [ ] Sidebar Select Notes → чекбоксы в списке → select all/clear → delete modal appears
- [ ] Delete flow with confirm input; after success список обновляется (invalidate)
- [ ] Ошибка одного удаления: показывается тост/сообщение, выбранное очищено
- [ ] Фильтр по тегу/поиск активны: select all выбирает только видимые

## End-to-End Tests
**What user flows need validation?**

- [ ] Desktop: Select Notes → выбрать несколько → Delete → ввести число → подтвердить → заметки исчезли
- [ ] Mobile: та же цепочка + проверка меню/модала не выходит за экран
- [ ] Отмена удаления: модал закрывается, выбор остаётся
- [ ] Reset: выход из selection mode сбрасывает чекбоксы

## Test Data
**What data do we use for testing?**

- Фикстуры заметок (минимум 3-5) с разными тегами/поиском.
- Моки delete мутаций (успех/частичный провал).
- Cypress: seed через Supabase тестового пользователя/заметки или моки API.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Команды: `npm run test -- --coverage`, `npm run type-check`, `npm run eslint`.
- Покрытие: новые модули 100%, остальное — без регрессий.
- Фиксируем ручной чеклист (desktop/mobile) в MR описании.

## Manual Testing
**What requires human validation?**

- Визуал: чекбоксы, кнопки (Select/Unselect/Delete), модал на desktop/mobile.
- Доступность: фокус/клавиатура для чекбоксов и модала.
- Smoke после деплоя: удаление нескольких заметок, отмена.

## Performance Testing
**How do we validate performance?**

- Ручной тест удаления 50–100 заметок: время, отсутствие подвисаний UI.
- Опционально: батч с ограниченной параллельностью.

## Bug Tracking
**How do we manage issues?**

- Заводим задачи в трекере по приоритету (P0 — потеря данных).
- Регрессии: e2e flow после фиксов, unit/integration остаются зелёными.

