---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
feature: full-text-search-optimization
---

# Project Planning & Task Breakdown: Full-Text Search Optimization

## Milestones
**What are the major checkpoints?**

- [ ] **M1: Backend FTS Implementation** - FTS search functions работают в API
- [ ] **M2: Frontend Integration** - UI использует FTS и показывает highlighting
- [ ] **M3: Testing & Optimization** - Все тесты проходят, производительность подтверждена
- [ ] **M4: Production Deployment** - Фича задеплоена и мониторится

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Backend FTS Implementation
**Goal**: Реализовать FTS поиск в backend с fallback логикой

- [ ] **Task 1.1: Create database RPC function** (1-2 hours)
  - Создать миграцию `supabase/migrations/20251021_add_fts_search_function.sql`
  - Реализовать `search_notes_fts()` RPC функцию
  - Добавить ts_rank для ranking
  - Добавить ts_headline для highlighting
  - Тестировать в Supabase SQL Editor

- [ ] **Task 1.2: Create FTS search functions** (2-3 hours)
  - Создать `lib/supabase/search.js`
  - Реализовать `searchNotesFTS(query, userId, options)`
  - Реализовать `buildTsQuery(query, language)` с sanitization (max 1000 chars)
  - Добавить language detection/mapping (ru/en/uk → russian/english)
  - Тестировать с разными запросами

- [ ] **Task 1.3: Implement ILIKE fallback** (1 hour)
  - Реализовать `searchNotesILIKE(query, userId, options)`
  - Обеспечить одинаковый response format с FTS
  - Добавить logging когда используется fallback

- [ ] **Task 1.4: Update search API endpoint** (2 hours)
  - Обновить `app/api/notes/search/route.js`
  - Try FTS first, catch errors → fallback ILIKE
  - Добавить execution time tracking
  - Добавить query параметры: `lang`, `minRank`, `limit`, `offset`
  - Return metadata: `method` (fts/ilike), `executionTime`

- [ ] **Task 1.5: Verify ts_headline highlighting** (30 min)
  - Проверить что `ts_headline()` работает в RPC функции
  - Параметры уже настроены: MaxWords=50, MinWords=25, MaxFragments=3
  - Проверить HTML безопасность (только <mark> теги)
  - Fallback: если нет headline, вернуть первые 200 символов content

### Phase 2: Frontend Integration
**Goal**: Обновить UI для работы с FTS результатами и highlighting

- [ ] **Task 2.1: Update search query hook** (1 hour)
  - Обновить `hooks/useNotesQuery.js`
  - Добавить `useSearchNotes(query, options)` hook
  - Использовать React Query с debouncing (300ms) и staleTime (30s)
  - Добавить language detection: browser locale (navigator.language) → fallback 'ru'
  - Добавить минимальную длину запроса (3+ символа) для лучшей производительности

- [ ] **Task 2.2: Create SearchResults component** (2 hours)
  - Создать/обновить компонент для отображения результатов
  - Render `headline` с HTML highlighting (через dangerouslySetInnerHTML с sanitization)
  - Показать relevance score (опционально, для debugging)
  - Показать badge "Fast Search" когда используется FTS

- [ ] **Task 2.3: Update existing search UI** (1 hour)
  - Интегрировать новый hook в существующий search component
  - Обеспечить обратную совместимость
  - Добавить loading states
  - Обработать empty results

### Phase 3: Testing & Optimization
**Goal**: Обеспечить качество и производительность

- [ ] **Task 3.1: Write unit tests** (2-3 hours)
  - Тесты для `buildTsQuery()` - sanitization, edge cases
  - Тесты для `searchNotesFTS()` - разные запросы, языки
  - Тесты для `searchNotesILIKE()` - fallback работает
  - Тесты для API endpoint - error handling, fallback logic

- [ ] **Task 3.2: Write integration tests** (2 hours)
  - E2E тест: search → FTS results → highlighting отображается
  - E2E тест: FTS error → fallback на ILIKE работает
  - Тест производительности: 10K записей < 100ms
  - Тест: разные языки (ru/en/uk) работают корректно

- [ ] **Task 3.3: Performance testing** (1-2 hours)
  - Benchmark FTS vs ILIKE на реальных данных
  - Тест с 10K, 50K, 100K записей
  - Документировать результаты в `docs/PERFORMANCE_TEST_RESULTS.md`
  - Оптимизировать если нужно (query tuning, index hints)

- [ ] **Task 3.4: Manual testing** (1 hour)
  - Тестировать с разными типами запросов
  - Проверить highlighting качество
  - Проверить edge cases: спецсимволы, длинные запросы, пустые запросы
  - Проверить на мобильных устройствах

### Phase 4: Documentation & Deployment
**Goal**: Задокументировать и задеплоить фичу

- [ ] **Task 4.1: Update documentation** (1 hour)
  - Обновить `docs/ARCHITECTURE.md` - добавить FTS секцию
  - Обновить `docs/QUICK_REFERENCE.md` - примеры FTS запросов
  - Документировать API changes в implementation doc

- [ ] **Task 4.2: Deploy to production** (30 min)
  - Проверить что FTS индексы существуют в production
  - Deploy через GitHub Actions
  - Smoke test после деплоя

- [ ] **Task 4.3: Monitoring setup** (1 hour)
  - Добавить logging для FTS vs ILIKE usage (console.warn в production)
  - Мониторить execution time (логировать если > 200ms)
  - Документировать метрики для будущих алертов: fallback rate > 5%
  - Добавить метрики в response для debugging (method, executionTime)

## Dependencies
**What needs to happen in what order?**

**Task dependencies:**
- Task 1.2 зависит от 1.1 (JS функции нужны RPC функцию)
- Task 1.4 зависит от 1.2 и 1.3 (API нужны search functions)
- Task 2.1 зависит от 1.4 (frontend нужен working API)
- Task 2.2 и 2.3 зависят от 2.1 (UI components нужен hook)
- Phase 3 зависит от Phase 1 и 2 (тестируем готовую функциональность)
- Task 4.2 зависит от 3.x (деплоим только после тестов)

**External dependencies:**
- ✅ PostgreSQL FTS индексы уже созданы (`idx_notes_fts`)
- ✅ Supabase API доступен
- ✅ Next.js API routes работают

**Blocking issues:**
- Нет блокеров, все зависимости готовы

## Timeline & Estimates
**When will things be done?**

**Effort estimates:**
- Phase 1: 7-9 hours (Backend + RPC)
- Phase 2: 4 hours (Frontend)
- Phase 3: 5-7 hours (Testing)
- Phase 4: 2.5 hours (Docs & Deploy)
- **Total: 18.5-22.5 hours** (~3 дня работы)

**Milestones timeline:**
- M1 (Backend): День 1
- M2 (Frontend): День 2
- M3 (Testing): День 2-3
- M4 (Deployment): День 3

**Buffer for unknowns:**
- +20% buffer для unexpected issues
- Итого: ~4 дня с буфером

## Risks & Mitigation
**What could go wrong?**

### Technical Risks

**Risk 1: FTS индексы не оптимальны**
- Probability: Low
- Impact: High
- Mitigation: Протестировать производительность на реальных данных в Task 3.3
- Fallback: Оптимизировать индексы или использовать ILIKE

**Risk 2: ts_headline слишком медленный**
- Probability: Medium
- Impact: Medium
- Mitigation: Benchmark в Task 3.3, можем отключить highlighting если медленно
- Fallback: Клиентский highlighting или вообще без highlighting

**Risk 3: Language detection работает плохо**
- Probability: Medium
- Impact: Low
- Mitigation: Использовать browser locale или user preference
- Fallback: Использовать 'simple' config (без stemming)

**Risk 4: Breaking changes в существующем API**
- Probability: Low
- Impact: High
- Mitigation: Обеспечить обратную совместимость, тестировать существующие flows
- Fallback: Feature flag для постепенного rollout

### Resource Risks
- **Risk**: Недостаточно времени для полного тестирования
- **Mitigation**: Приоритизировать критичные тесты (Task 3.1, 3.2)

### Dependency Risks
- **Risk**: Supabase FTS limitations
- **Mitigation**: Проверить Supabase docs, тестировать на dev environment

## Resources Needed
**What do we need to succeed?**

**Team members:**
- 1 Full-stack developer (backend + frontend + testing)

**Tools and services:**
- ✅ PostgreSQL 14+ с FTS support
- ✅ Supabase (уже настроен)
- ✅ Next.js dev environment
- ✅ Testing frameworks (Jest, Cypress)

**Infrastructure:**
- ✅ Dev database с test data (10K+ записей)
- ✅ Staging environment для integration testing
- ✅ Production database с FTS индексами

**Documentation/knowledge:**
- PostgreSQL FTS documentation: https://www.postgresql.org/docs/current/textsearch.html
- Supabase FTS guide: https://supabase.com/docs/guides/database/full-text-search
- ts_rank documentation
- ts_headline documentation

**Additional resources:**
- Test data generator (уже есть в `scripts/generate-test-notes.js`)
- Performance measurement tools (уже есть в `scripts/measure-performance.js`)

