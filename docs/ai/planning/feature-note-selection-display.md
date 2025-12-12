---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Обновить контроллер для расчета counts в разных режимах
- [ ] Обновить UI sidebar под новую метку
- [ ] Обновить/добавить тесты (component) для метки в обычном/поиске/тегах

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Проанализировать текущие вычисления total/visible в useNoteAppController
- [ ] Определить единые поля `notesDisplayed`, `notesTotal`

### Phase 2: Core Features
- [ ] Реализовать вычисление counts для обычного списка и FTS (с учётом тегов)
- [ ] Передать counts в Sidebar; заменить старый лейбл на «Notes displayed: X out of Y»
- [ ] Сохранить текущую логику удаления (только загруженные), без авто-добавления

### Phase 3: Integration & Polish
- [ ] Обновить компонентные тесты Sidebar на разные режимы (обычный, поиск, теги)
- [ ] Быстрый ручной тест (обычный, поиск, теги) на корректность чисел

## Dependencies
**What needs to happen in what order?**

- Контроллер counts → Sidebar UI → Тесты

## Timeline & Estimates
**When will things be done?**

- Реализация + тесты: краткосрочная задача (день)

## Risks & Mitigation
**What could go wrong?**

- Несогласованность total для FTS: использовать длину накопленных данных, если нет total.
- Ошибки при фильтрации тегами: проверять counts после фильтра.

## Resources Needed
**What do we need to succeed?**

- Доступ к компонентным тестам (Cypress)
- Данные с FTS/тегами для ручной проверки
