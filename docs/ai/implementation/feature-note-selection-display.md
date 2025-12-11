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
- `notesDisplayed`: длина видимых данных (обычный список или FTS результаты)
- `notesTotal`:
  - Обычный режим: `pages[0].totalCount`
  - FTS режим: `undefined` если `ftsHasMore`, иначе `ftsAccumulatedResults.length`
- Sidebar показывает «Notes displayed: X out of Y» или «X out of unknown»
- Логика удаления/выбора остаётся только для загруженных элементов

### FTS Infinite Scroll
- `ftsHasMore = lastFtsPageSize === ftsLimit` (20) — простая проверка: если последняя страница полная, возможно есть ещё
- `ftsTotal = ftsHasMore ? undefined : ftsAccumulatedResults.length`
- `ftsObserverTarget` — отдельный ref для IntersectionObserver в FTS режиме
- `loadMoreFtsCallback` — useCallback для стабильной функции подгрузки
- Кнопка "Load More" присутствует как визуальный индикатор и fallback

### Patterns & Best Practices
- Не добавлять доп. запросы; использовать уже загруженные данные
- Unified UX: оба режима (обычный и FTS) имеют одинаковый infinite scroll + Load More кнопку
- "unknown" вместо неточного числа при неполной загрузке FTS

## Integration Points
**How do pieces connect?**

- useNoteAppController → Sidebar (новые props counts).
- NoteList остаётся источником данных; counts берутся из контроллера.

## Error Handling
**How do we handle failures?**

- FTS режим с неполной загрузкой: показываем `X out of unknown`
- После полной загрузки FTS: показываем `X out of X` (где X = длина накопленных результатов)
- Обычный режим: всегда показываем `X out of Y` (Y из totalCount)

## Performance Considerations
**How do we keep it fast?**

- 0 дополнительных запросов; только расчёт по имеющимся данным.

## Security Notes
**What security measures are in place?**

- Нет новых API/секретов.
