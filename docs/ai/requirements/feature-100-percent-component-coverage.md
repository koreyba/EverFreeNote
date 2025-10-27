---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Текущее покрытие компонентными тестами составляет 83.43% для всего кода и 71.83% для компонентов
- Многие критичные компоненты не имеют тестов: ErrorBoundary, ImportButton, ImportDialog, SearchResults, VirtualNoteList
- UI библиотека shadcn/ui имеет 40+ компонентов, из которых протестировано только 5 (badge, button, card, input, textarea)
- Hooks не покрыты тестами совсем (useNotesMutations, useNotesQuery, useInfiniteScroll)
- Утилиты и библиотеки (lib/) имеют минимальное покрытие
- RichTextEditor имеет только 53.65% покрытия несмотря на 16 тестов
- Без полного покрытия невозможно гарантировать стабильность приложения при рефакторинге

## Goals & Objectives
**What do we want to achieve?**

**Primary goals:**
- Достичь 100% покрытия всех компонентов приложения компонентными тестами
- Покрыть все UI компоненты из библиотеки shadcn/ui
- Создать тесты для всех custom hooks
- Увеличить покрытие RichTextEditor до 100%
- Покрыть тестами критичные компоненты (ErrorBoundary, Import*, SearchResults, VirtualNoteList)

**Secondary goals:**
- Создать тесты для провайдеров (QueryProvider, theme-provider)
- Покрыть утилиты в lib/utils.js
- Документировать паттерны тестирования для каждого типа компонентов
- Настроить минимальный порог покрытия в CI/CD (90%+)

**Non-goals:**
- Не создавать тесты для node_modules
- Не тестировать конфигурационные файлы
- Не создавать e2e тесты (только компонентные)
- Не тестировать lib/enex/* (это отдельная библиотека для импорта)

## User Stories & Use Cases
**How will users interact with the solution?**

- As a разработчик, I want to иметь 100% покрытие компонентов so that быть уверенным что любые изменения не сломают функциональность
- As a разработчик, I want to иметь тесты для всех UI компонентов so that проверять их работу в изоляции
- As a разработчик, I want to иметь тесты для hooks so that проверять бизнес-логику независимо от UI
- As a тех.лид, I want to видеть метрики покрытия в CI/CD so that контролировать качество кода

**Key workflows:**
1. Разработчик создает новый компонент → пишет тесты → проверяет coverage
2. Разработчик изменяет существующий компонент → запускает тесты → проверяет что ничего не сломалось
3. CI/CD проверяет coverage → блокирует merge если покрытие < 90%

**Edge cases:**
- Компоненты с асинхронной загрузкой данных
- Компоненты с внешними зависимостями (Supabase, IndexedDB)
- Компоненты с complex state management
- Error boundaries и обработка ошибок
- Виртуализированные списки

## Success Criteria
**How will we know when we're done?**

**Measurable outcomes:**
- 100% покрытие всех компонентов в components/ (кроме ui библиотеки)
- 90%+ покрытие UI компонентов shadcn/ui (приоритет на используемые)
- 100% покрытие всех custom hooks в hooks/
- 100% покрытие RichTextEditor (сейчас 53.65%)
- 100% покрытие критичных компонентов: ErrorBoundary, Import*, SearchResults, VirtualNoteList
- Общее покрытие компонентов: 95%+

**Acceptance criteria:**
- [ ] Все компоненты в components/ имеют тесты
- [ ] Все hooks имеют тесты
- [ ] RichTextEditor покрытие = 100%
- [ ] ErrorBoundary покрытие = 100%
- [ ] Import компоненты покрытие = 100%
- [ ] SearchResults покрытие = 100%
- [ ] VirtualNoteList покрытие = 100%
- [ ] Минимум 20 UI компонентов shadcn/ui покрыты тестами
- [ ] Coverage отчет показывает 95%+ для components/
- [ ] Все тесты проходят без ошибок

**Performance benchmarks:**
- Время запуска всех компонентных тестов < 2 минуты
- Каждый отдельный тест выполняется < 5 секунд

## Constraints & Assumptions
**What limitations do we need to work within?**

**Technical constraints:**
- Используем Cypress для компонентного тестирования
- Babel instrumentation для coverage
- Next.js framework с SPA режимом
- Существующая структура тестов должна сохраниться

**Business constraints:**
- Не ломать существующие 74 теста
- Поддерживать текущую скорость разработки
- Не требовать дополнительных инструментов

**Time/budget constraints:**
- Реализовать за 1-2 недели
- Приоритизировать критичные компоненты
- Можно делать итеративно (по группам компонентов)

**Assumptions:**
- Cypress компонентное тестирование работает стабильно
- Babel instrumentation не влияет на производительность dev сервера
- Разработчики знакомы с паттернами тестирования из существующих тестов
- CI/CD может запускать Cypress тесты

## Questions & Open Items
**What do we still need to clarify?**

**Unresolved questions:**
- Нужно ли тестировать все 40+ UI компонентов shadcn/ui или только используемые?
- Как тестировать компоненты с Supabase зависимостями?
- Как тестировать виртуализированные списки (VirtualNoteList)?
- Нужно ли тестировать theme-provider и theme-toggle?
- Как тестировать ErrorBoundary (намеренные ошибки)?

**Items requiring stakeholder input:**
- Приоритет компонентов для покрытия (если не все сразу)
- Минимальный порог coverage для CI/CD
- Нужна ли интеграция с coverage reporting сервисами (Codecov, Coveralls)?

**Research needed:**
- Лучшие практики тестирования React hooks в Cypress
- Паттерны тестирования ErrorBoundary
- Способы мокирования Supabase в компонентных тестах
- Тестирование виртуализированных списков

