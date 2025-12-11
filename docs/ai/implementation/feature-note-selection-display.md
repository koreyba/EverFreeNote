---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Стандартная dev-среда проекта (`npm install`, `npm run dev`), Supabase env настроены.

## Code Structure
**How is the code organized?**

- Контроллер: `ui/web/hooks/useNoteAppController.ts`
- UI: `components/features/notes/Sidebar.tsx`
- Тесты: `cypress/component/features/notes/Sidebar.cy.tsx`

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Добавить вычисление `notesDisplayed` (длина видимых данных) и `notesTotal` (общее для текущего контекста: обычный список totalCount, FTS total/accumulated, учитывая тег фильтр).
- Передать counts в Sidebar и отрендерить «Notes displayed: X out of Y».
- Логика удаления/выбора остаётся только для загруженных элементов.

### Patterns & Best Practices
- Не добавлять доп. запросы; использовать уже загруженные данные + метаданные total.
- FTS: если total отсутствует, используем длину накопленных результатов.

## Integration Points
**How do pieces connect?**

- useNoteAppController → Sidebar (новые props counts).
- NoteList остаётся источником данных; counts берутся из контроллера.

## Error Handling
**How do we handle failures?**

- Если total неизвестен, показываем честно `X out of X` (нет «+1» эвристик).

## Performance Considerations
**How do we keep it fast?**

- 0 дополнительных запросов; только расчёт по имеющимся данным.

## Security Notes
**What security measures are in place?**

- Нет новых API/секретов.
