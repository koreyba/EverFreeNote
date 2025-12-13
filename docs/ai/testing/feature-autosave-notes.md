---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- 100% новых автосейв хэндлеров; интеграции контроллера с cache/queue.
- Интеграционные сценарии оффлайн→онлайн, debounce, compaction/overlay.
- E2E ключевых юзер-историй (закрытие вкладки/переключение заметок — восстановление).

## Unit Tests
**What individual components need testing?**

### useNoteAppController (autosave handler)
- [ ] enqueue partial update with clientUpdatedAt
- [ ] skip enqueue when no changes
- [ ] updates offline cache + overlay

### useDebouncedCallback
- [ ] Calls once after delay
- [ ] Cancels/restarts on rapid input
- [ ] Cleans timer on unmount

### Offline services (existing stubs)
- [ ] enforceLimit/compaction invoked in autosave path (if applicable)

## Integration Tests
**How do we test component interactions?**

- [ ] NoteEditor + controller: typing triggers debounced autosave, Saving… state visible, overlay updates.
- [ ] Offline mode: autosave enqueues pending items, counters increment.
- [ ] Online sync: queue drained by SyncManager, overlay reconciled, counters drop.

## End-to-End Tests
**What user flows need validation?**

- [ ] Typing note → close tab → reopen: content restored from cache.
- [ ] Switch to another note: current note autosaved; reopened with latest edits.
- [ ] Offline typing → go online: changes appear on server (or via mocked Supabase), no duplicate saves.

## Test Data
**What data do we use for testing?**

- Fixture notes with ids, simple text/tags; large body sample for perf.
- Mocked offline storage/queue in component tests; real IndexedDB for E2E if feasible.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run type-check`, `npm run test:component`, `npm run test:e2e` (spec-filtered).
- Coverage via Cypress component coverage (existing config); gaps documented if any perf-sensitive code.

## Manual Testing
**What requires human validation?**

- UX: Saving… / Saved states, no flicker.
- Browser refresh/close tab recovery.
- Slow network/offline throttling behavior.

## Performance Testing
**How do we validate performance?**

- Debounce effective: no more than 1 autosave per 1–2 s during continuous typing.
- Queue size stable with compaction; cache write time not noticeable.

## Bug Tracking
**How do we manage issues?**

- Отмечать регрессии в autosave/queue/overlay; severity high при потере данных.

