---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Документы согласованы (req/design/plan/testing)
- [ ] Milestone 2: Автосейв (debounce, partial payload) + UI индикация
- [ ] Milestone 3: Offline/queue интеграция и покрытия тестами

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Добавить debounced auto-save handlers в NoteEditor/RichTextEditor (title/tags/body)
- [ ] Task 1.2: Завести API контроллера `handleAutoSave`/подобный для partial payload

### Phase 2: Core Features
- [ ] Task 2.1: Обновлять OfflineCacheService + overlay при автосейве (applyNoteOverlay)
- [ ] Task 2.2: enqueue в OfflineQueueService с clientUpdatedAt, без прямых сетевых вызовов
- [ ] Task 2.3: Индикация “Saving…/Saved” на кнопке + pending/failed счётчики/last sync

### Phase 3: Integration & Polish
- [ ] Task 3.1: Интеграция с OfflineSyncManager (без ручного drain)
- [ ] Task 3.2: Тесты: debounce, оффлайн→онлайн, очередь/compaction, UI индикаторы

## Dependencies
**What needs to happen in what order?**

- Phase 1 перед Phase 2; SyncManager зависимость для Phase 3.
- Reuse существующих adapters/services; нет внешних API зависимостей.

## Timeline & Estimates
**When will things be done?**

- Phase 1: 0.5–1d
- Phase 2: 1d
- Phase 3: 1d (включая тесты)

## Risks & Mitigation
**What could go wrong?**

- Частые автосейвы → рост очереди: mitigated partial payload + debounce + compaction.
- UI мерцания статуса: удерживать состояние Saving/Saved с таймером.
- Offline IndexedDB ошибки: fallback на localStorage уже есть.

## Resources Needed
**What do we need to succeed?**

- Cypress component/integration harness (уже есть)
- Время на покрытие offline/queue сценариев
- Доступ к Supabase для онлайновых smoke (не критично для автосейва)

