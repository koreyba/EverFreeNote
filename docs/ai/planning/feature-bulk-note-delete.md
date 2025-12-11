---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Дизайн/план согласованы
- [ ] Milestone 2: Реализован UI и логика выбора/удаления, без регрессий
- [ ] Milestone 3: Тесты (unit/integration/E2E) и ручная проверка пройдены

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Расширить `useNoteAppController` selection state/handlers, totalNotes
- [ ] Task 1.2: Обновить NoteList/NoteCard для чекбоксов и кликов в selection mode

### Phase 2: Core Features
- [ ] Task 2.1: Добавить кнопку Select Notes + select all/clear + Delete (visible on selection)
- [ ] Task 2.2: Реализовать BulkDeleteModal с подтверждением числа выбранных
- [ ] Task 2.3: Интегрировать deleteSelected (batch delete + invalidate)

### Phase 3: Integration & Polish
- [ ] Task 3.1: UI/UX polish для мобильных (меню, чекбоксы, доступность)
- [ ] Task 3.2: Тесты (unit + Cypress flow), ручной чеклист, обновить доки

## Dependencies
**What needs to happen in what order?**

- Контроллер selection state → NoteList UI → Bulk modal + delete handlers.
- Используем существующие delete мутации; внешних API нет.
- Блокер: при необходимости ограничить параллельные запросы (можно позже).

## Timeline & Estimates
**When will things be done?**

- Оценка: Phase1 ~0.5d, Phase2 ~1d, Phase3 ~0.5d.
- Буфер 0.5d на фиксы UI/тестов.

## Risks & Mitigation
**What could go wrong?**

- Риск: большие батчи удаления → timeouts. Митигация: ограничить параллельность, показывать прогресс/тосты.
- Риск: режим выбора конфликтует с существующими кликами (открытие заметки). Митигация: условные хэндлеры, тесты.
- Риск: мобильное меню перекрывает. Митигация: позиционирование/адаптивные стили.
- Риск: случайное удаление. Митигация: подтверждение числом, чёткий текст.

## Resources Needed
**What do we need to succeed?**

- Текущая команда/стек достаточно: React/Next, Supabase, Cypress.
- Документация: эти файлы + существующие сервисы нот/мутации.
