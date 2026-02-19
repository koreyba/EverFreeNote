---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy — mobile-bulk-edit

## Test Coverage Goals

- Unit tests: 100% для новых хуков (`useBulkSelection`, `useBulkDeleteNotes`)
- Integration tests: ключевые сценарии взаимодействия selection mode + delete + кеш
- E2E / Manual: визуальные аспекты (анимации, layout, gestures) — только ручное тестирование
- Регрессия: swipe-to-delete одиночной заметки должен продолжать работать

## Unit Tests

### `useBulkSelection`
- [ ] Начальное состояние: `isActive=false`, `selectedIds` пустой
- [ ] `activate(id)` → `isActive=true`, `selectedIds = Set([id])`
- [ ] `toggle(id)` когда id не выбран → id добавляется
- [ ] `toggle(id)` когда id выбран → id удаляется
- [ ] `selectAll(['a', 'b', 'c'])` → `selectedIds = Set(['a','b','c'])`
- [ ] `clear()` → `selectedIds` пустой, `isActive` не меняется
- [ ] `deactivate()` → `isActive=false`, `selectedIds` пустой
- [ ] `toggle` не изменяет `isActive`

### `useBulkDeleteNotes`
- [ ] `bulkDelete(['a', 'b'])` вызывает `deleteNote` для каждого id
- [ ] `isPending=true` во время выполнения, `false` после
- [ ] Если один `deleteNote` падает — остальные всё равно выполняются (allSettled)
- [ ] `bulkDelete([])` — не вызывает `deleteNote` вообще

## Integration Tests

- [ ] Long press на NoteCard → `activate()` вызван с правильным id → `isSelectionMode` передаётся в карточки
- [ ] Tap на карточку в selection mode → `toggle()` вызван (не навигация)
- [ ] "Select All" → `selectAll(allLoadedIds)` → все карточки показывают `isSelected=true`
- [ ] "Delete" при `selectedIds.size === 0` → кнопка disabled, `bulkDelete` не вызывается
- [ ] Полный flow: activate → select 3 notes → delete → confirm → `bulkDelete` called → `deactivate()` called
- [ ] Search screen: смена `debouncedQuery` → `deactivate()` вызван → `isActive=false`
- [ ] Ошибка в одном из `deleteNote` → `isPending` сбрасывается, успешные ноты удалены из кеша

## End-to-End Tests (manual)

- [ ] Long press держать 500ms → selection mode активируется, чекбоксы появляются
- [ ] Haptic feedback ощущается при long press
- [ ] BulkActionBar slide-up анимация плавная
- [ ] Выбор/снятие отдельных заметок — чекбокс обновляется мгновенно
- [ ] "Select All (50)" — все видимые карточки отмечены
- [ ] "Deselect All" — все карточки сняты
- [ ] Confirmation alert показывает правильное число ("Delete 3 notes?")
- [ ] После delete: заметки исчезают, selection mode закрывается
- [ ] Свайп-удаление вне selection mode — работает по-прежнему
- [ ] Offline: после bulk delete заметки пропадают оптимистично, затем синкаются
- [ ] Search: ввод нового запроса → selection mode сбрасывается
- [ ] iPad / большой экран (если применимо): layout BulkActionBar корректный

## Test Data

- Использовать существующие `createMockNote` и `createMockNotes` из `tests/testUtils.tsx`
- Для тестов `useBulkDeleteNotes`: мокать `useDeleteNote` через `jest.mock`
- Для интеграционных тестов: `createMockNoteService` с предзаполненными заметками

## Test Reporting & Coverage

- Запуск: `cd ui/mobile && npm run test`
- Coverage: `cd ui/mobile && npm run test:coverage`
- Новые файлы должны попасть в coverage: `hooks/useBulkSelection.ts`, `hooks/useBulkDeleteNotes.ts`
- `BulkActionBar.tsx` — компонентный тест опционален (чисто UI, мало логики)

## Manual Testing

**Устройства для проверки:**
- iOS симулятор (iPhone 14, iPhone SE — проверить thumb reach на маленьком экране)
- Android эмулятор (Pixel 7)
- Реальное устройство для haptics и gesture testing

**Checklist перед релизом:**
- [ ] Long press не вызывает scroll
- [ ] BulkActionBar не перекрывает tab bar и не уходит за экран
- [ ] Header title правильно обновляется при изменении числа выбранных
- [ ] Cancel в header выходит из selection mode без удаления
- [ ] Кнопка Delete красная, disabled при 0 выбранных
- [ ] Alert на русском и английском (проверить локализацию если используется)
- [ ] Orientation change (landscape) — layout корректен

## Performance Testing

- FlashList с 50+ карточками в selection mode: убедиться что нет jank при tap-toggle
- Проверить через React DevTools Profiler что каждый toggle ре-рендерит только изменённую карточку + BulkActionBar счётчик

## Bug Tracking

- Критические: selection mode не выходит (пользователь застрял), данные теряются при delete без confirmation
- Средние: неправильный счётчик, BulkActionBar layout issue
- Низкие: анимационные артефакты, haptic не срабатывает
