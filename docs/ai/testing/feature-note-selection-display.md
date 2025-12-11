---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Component: Sidebar отображает корректные counts во всех режимах.
- Интеграция: контроллер даёт корректные числа для обычного списка, поиска, тегов.
- Acceptance: метка обновляется при смене режима и загрузке данных.

## Unit Tests
**What individual components need testing?**

### Sidebar
- [ ] Рендер «Notes displayed: X out of Y» с заданными props.
- [ ] Корректное обновление при смене значений X/Y.

## Integration Tests
**How do we test component interactions?**

- [ ] Контроллер + Sidebar в режиме обычного списка (total из pages[0].totalCount).
- [ ] Контроллер + Sidebar в режиме поиска (FTS total/длина результатов).
- [ ] Контроллер + Sidebar с фильтром по тегу.

## End-to-End Tests
**What user flows need validation?**

- [ ] Включить поиск/тег, убедиться в корректности метки и консистентности с видимыми карточками.

## Test Data
**What data do we use for testing?**

- Моки для компонентных тестов (Cypress) с разными counts (0, N, FTS).

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run test:component` (или точечный spec для Sidebar) + визуальная проверка.

## Manual Testing
**What requires human validation?**

- Обычный список: метка совпадает с загруженными карточками.
- Поиск: метка «X out of Y», X = показываемые, Y = total из выдачи.
- Теги: метка отражает фильтрованный набор.

## Performance Testing
**How do we validate performance?**

- Нет изменений производительности; визуальная проверка на больших списках.

## Bug Tracking
**How do we manage issues?**

- Если чисел не хватает/рассинхрон — завести баг, приложить скриншот и контекст режима (поиск/тег).
