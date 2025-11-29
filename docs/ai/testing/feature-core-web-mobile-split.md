---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit: 100% новых/перенесённых core модулей (типы, сервисы, use-cases, адаптерные интерфейсы).
- Integration: web адаптеры + core (auth/notes) работают с Supabase mock; RN адаптеры компилируются и проходят базовые интеграционные проверки.
- E2E: веб-smoke авторизация/CRUD не сломаны; mobile E2E позже (вне этой фазы).

## Unit Tests
**What individual components need testing?**

### Core services/use-cases
- [ ] Auth use-case: web callback handling без window, с mock адаптером.
- [ ] Notes/search services: корректные запросы через Supabase client интерфейс.
- [ ] Adapters interfaces: validate contract via fake implementations.

### Core utilities
- [ ] Config parsing/validation.
- [ ] Error handling paths.

## Integration Tests
**How do we test component interactions?**

- [ ] Web adapters + core auth flow (mock Supabase, mock storage/location).
- [ ] RN adapters + core auth flow (mock AsyncStorage/Linking) — компиляция + runtime smoke.
- [ ] Supabase client factory selection per platform.

## End-to-End Tests
**What user flows need validation?**

- [ ] Web: sign-in via Google → notes list available (existing E2E smoke reused).
- [ ] Web: CRUD note still works after refactor.
- [ ] Mobile: placeholder (out of scope for this phase, plan only).

## Test Data
**What data do we use for testing?**

- Supabase mock/stub for unit/integration (no real network).
- Fixtures for notes/search responses.
- Config fixtures for env/paths.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run test -- --coverage` for unit/integration (core + web adapters).
- Track coverage gaps for core modules in CI.
- Manual smoke results recorded in planning/implementation notes.

## Manual Testing
**What requires human validation?**

- Web auth redirect and notes CRUD after реорганизации.
- DevTools/network check на отсутствие лишних запросов/ошибок.

## Performance Testing
**How do we validate performance?**

- Наблюдение за bundle size web (чтобы core не тянул лишнее).
- tsc time и basic perf sanity; глубже не в этой фазе.

## Bug Tracking
**How do we manage issues?**

- Любые регрессии web фиксируем задачами в плане.
- Отдельно логируем блокеры RN адаптеров для следующей фазы.***
