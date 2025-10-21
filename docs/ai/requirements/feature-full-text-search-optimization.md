---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
feature: full-text-search-optimization
---

# Requirements & Problem Understanding: Full-Text Search Optimization

## Problem Statement
**What problem are we solving?**

- **Core Problem**: Текущий поиск по заметкам использует PostgreSQL `ILIKE` оператор, который работает медленно на больших объемах данных (10,000+ записей). При росте базы заметок время поиска увеличивается линейно.
- **Who is affected**: Все пользователи приложения, которые используют функцию поиска заметок.
- **Current situation**: 
  - FTS индексы уже созданы (`idx_notes_fts`)
  - Используется `ILIKE` fallback (работает, но медленно при больших объемах)
  - Нет использования Full-Text Search возможностей PostgreSQL
  - Нет ранжирования результатов по релевантности
  - Нет подсветки найденных фрагментов

## Goals & Objectives
**What do we want to achieve?**

**Primary goals:**
- Реализовать Full-Text Search (FTS) с использованием существующих индексов
- Достичь 10x+ ускорения поиска по сравнению с `ILIKE`
- Добавить ранжирование результатов по релевантности (ts_rank)
- Реализовать подсветку найденных фрагментов (highlighting)

**Secondary goals:**
- Поддержка stemming для русского, английского и украинского языков
- Fuzzy matching через stemming (не Levenshtein distance)
- Масштабируемость до миллионов записей

**Non-goals:**
- Изменение UI/UX поиска (используем существующий интерфейс)
- Добавление новых полей для поиска (работаем с title, content, tags)
- Реализация advanced search filters (это отдельная фича)

## User Stories & Use Cases
**How will users interact with the solution?**

1. **As a user**, I want to **quickly find notes by keywords** so that **I can access information in milliseconds even with thousands of notes**
   - Acceptance: Поиск выполняется < 100ms для базы с 10,000+ заметок

2. **As a user**, I want to **see the most relevant results first** so that **I don't waste time scrolling through irrelevant matches**
   - Acceptance: Результаты отсортированы по ts_rank, наиболее релевантные сверху

3. **As a user**, I want to **see highlighted search terms in results** so that **I can quickly understand why a note matched my query**
   - Acceptance: Найденные фрагменты подсвечены в preview заметки

4. **As a user**, I want to **find notes even with typos** so that **I don't need to remember exact spelling**
   - Acceptance: Fuzzy matching находит похожие слова (stemming работает)

**Edge cases:**
- Пустой поисковый запрос → возвращаем все заметки
- Нет результатов → показываем "No results found"
- FTS ошибка → fallback на `ILIKE`
- Специальные символы в запросе → экранирование или игнорирование

## Success Criteria
**How will we know when we're done?**

**Measurable outcomes:**
- ✅ Время поиска < 100ms для 10,000+ заметок (vs 500ms+ с ILIKE)
- ✅ FTS используется в 100% успешных поисковых запросов
- ✅ Highlighting работает для всех результатов
- ✅ Stemming работает для русского, английского, украинского
- ✅ Fallback на ILIKE срабатывает при FTS ошибках

**Acceptance criteria:**
- [ ] Search API endpoint использует FTS вместо ILIKE
- [ ] Результаты ранжированы по ts_rank
- [ ] Найденные фрагменты подсвечены через ts_headline (MaxWords=50, MinWords=25, MaxFragments=3)
- [ ] Поддержка 3 языков: ru, en, uk
- [ ] Fallback логика работает без ошибок
- [ ] Fallback usage < 5% от всех запросов в production
- [ ] minRank = 0.1 фильтрует низкорелевантные результаты
- [ ] Все существующие тесты проходят
- [ ] Новые тесты покрывают FTS функциональность

**Performance benchmarks:**
- ILIKE baseline: ~500ms для 10,000 записей
- FTS target: < 100ms для 10,000 записей
- FTS target: < 500ms для 1,000,000 записей

## Constraints & Assumptions
**What limitations do we need to work within?**

**Technical constraints:**
- PostgreSQL 14+ (для FTS функций)
- Существующие FTS индексы (`idx_notes_fts`) уже созданы
- Supabase API для доступа к БД
- Next.js API routes для backend

**Business constraints:**
- Не ломать существующий функционал поиска
- Обратная совместимость с текущим API
- Нулевой downtime при деплое

**Assumptions:**
- FTS индексы корректно настроены и актуальны
- Пользователи хотят быстрый поиск важнее чем 100% точность
- Большинство запросов на русском, английском или украинском
- Fallback на ILIKE приемлем для edge cases

## Questions & Open Items
**What do we still need to clarify?**

**Resolved:**
- ✅ Какие поля индексировать? → title, content, tags
- ✅ Какие языки поддерживать? → ru, en, uk
- ✅ Нужен ли highlighting? → Да
- ✅ Сохранять ли ILIKE fallback? → Да

**Open questions:**
- ~~Нужно ли логировать когда срабатывает fallback?~~ → **Resolved**: Да, для мониторинга и алертов
- ~~Какой минимальный порог релевантности (ts_rank)?~~ → **Resolved**: 0.1 (стандартный для PostgreSQL FTS)
- ~~Нужно ли кэшировать популярные запросы?~~ → **Resolved**: Нет (пока), React Query на клиенте достаточно
- ~~Как обрабатывать очень длинные запросы?~~ → **Resolved**: Лимит 1000 символов с валидацией

**Research needed:**
- Протестировать производительность FTS на реальных данных
- Сравнить качество stemming для разных языков
- Определить оптимальную длину highlighted фрагментов

