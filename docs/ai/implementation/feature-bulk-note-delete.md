---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Используем существующий проект (Next.js, Supabase). `npm install`, `npm run dev`.
- Для тестов: `npm run type-check`, `npm run eslint`, Cypress компоненты/е2е по необходимости.
- Supabase env как в проекте; удаление использует текущий клиент.

## Code Structure
**How is the code organized?**

- Контроллер: `ui/web/hooks/useNoteAppController.ts` — добавить selection state/handlers.
- UI: `components/features/notes/Sidebar.tsx` (Select Notes, select all/clear, Delete trigger), `NoteList/NoteCard` для чекбоксов, модал — новый компонент в `components/features/notes/BulkDeleteModal.tsx` (или аналогичный путь).
- Мутации: переиспользуем delete mutation; можно добавить helper для batch delete.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Selection mode: флаг + `Set<string>`; toggle по клику на карточку/чекбокс; выход из режима — очистка state.
- Select all/clear: опираемся на текущий набор отображённых заметок (учёт фильтра/поиска).
- Bulk delete: модал с полем ввода числа; кнопка Delete активна только при совпадении; удаление через Promise.allSettled (ограничить параллельность при необходимости), затем invalidate notes, сброс selection.

### Patterns & Best Practices
- Держать состояние выбора в контроллере, не в отдельных карточках.
- Чистые пропсы: `isSelectionMode`, `selectedIds`, `onToggle`, `onSelectAll`, `onClear`.
- UI состояния: disable кнопок при нуле выбранных; loading при удалении.

## Integration Points
**How do pieces connect?**

- Контроллер вызывает delete mutation per id; после — `invalidateQueries(['notes'])`.
- NoteList получает selection props и рендерит чекбоксы.
- Sidebar кнопки вызывают контроллерные хендлеры; модал получает `selectedCount` и callbacks.

## Error Handling
**How do we handle failures?**

- Показывать тост с количеством неуспешных удалений (из allSettled).
- Если удаление частично: инвалидация кэша, повторная попытка вручную.
- Блокировать Delete в модале, пока не введено корректное число.

## Performance Considerations
**How do we keep it fast?**

- Ограничить параллельность (например, батчами по 10) при больших выборках.
- Не держать лишние перерендеры: мемоизация списков/чекбоксов.
- Избегать лишних toasts в цикле — агрегировать итог.

## Security Notes
**What security measures are in place?**

- Удаляем только заметки текущего пользователя (Supabase RLS).
- Валидация ввода числа в модале (целое, совпадает с selectedCount).
- Никаких новых секретов; используем существующий Supabase клиент.
