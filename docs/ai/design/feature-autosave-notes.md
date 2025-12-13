---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

```mermaid
graph TD
  NoteEditor -->|onChange (debounce 1.5s)| Controller[useNoteAppController]
  Controller --> Overlay[applyNoteOverlay + in-memory state]
  Controller --> Cache[OfflineCacheService (IndexedDB/localStorage)]
  Controller --> Queue[OfflineQueueService]
  Queue --> SyncMgr[OfflineSyncManager (compaction+retry/backoff)]
  SyncMgr --> Supabase[Supabase mutations]
  Cache --> UI[NoteList/NoteView/Sidebar]:::ui
  Overlay --> UI
  UI --> Status["Save button state + pending/failed counters + (optional) last saved at"]
  classDef ui fill:#eef9ff,stroke:#7fb3ff
```

- Автосейв триггерится из NoteEditor/RichTextEditor (title/tags/body) через debounced callback (по умолчанию 1.5 с, допустимо 1–2 с).
- Контроллер принимает partial payload, записывает в OfflineCacheService и enqueue в OfflineQueueService; SyncManager дренирует очередь при онлайне (компактация + retry/backoff).
- Overlay применяется для мгновенного UI (NoteList/NoteView/Sidebar), включая pending/failed счётчики.

## Data Models
**What data do we need to manage?**

- `CachedNote`: id, title?, description?, tags?, updatedAt, status (pending/failed/synced), pendingOps?, deleted?, content?; для автосейва обновляем только изменённые поля и updatedAt=clientUpdatedAt.
- `MutationQueueItem`: id, noteId, operation (`update` для автосейва), payload (partial: changed fields), clientUpdatedAt, status (pending/failed/synced), lastError?, attempts?.
- `SavedState` (в контроллере): lastSavedAt?, flags для отображения Saving/Saved, pendingCount/failedCount.

## API Design
**How do components communicate?**

- Внешних новых API нет: все сетевые мутации идут через Supabase клиент, вызываемый SyncManager.
- Внутренние интерфейсы:
  - `useDebouncedCallback(fn, delayMs)` — общая утилита для автосейва.
  - `handleAutoSave(partial: { id; title?; description?; tags?; clientUpdatedAt: string; version?: string })` в useNoteAppController:
    - Проверка diff (не отправлять, если нет изменений).
    - `offlineCache.saveNote(partialCachedNote)` + обновление overlay.
    - `offlineQueue.enqueue({ operation: 'update', payload: partial, clientUpdatedAt })`.
    - Не вызывает сетевые мутации напрямую; SyncManager обрабатывает очередь.
  - UI статус: Save button получает `isSavingAuto`/`lastSavedAt`/pending/failed для индикации.

## Component Breakdown
**What are the major building blocks?**

- Frontend:
  - `NoteEditor` / `RichTextEditor`: собирают изменения title/tags/body, вызывают debounced autosave handler, показывают Saving…/Saved (минимум 500 мс отображения), опционально last-saved timestamp.
  - `NoteList` / `NoteView`: отображают данные с overlay (включая pending/failed изменения).
  - `Sidebar`: показывает pending/failed, может показывать last saved at (если решим).
- Core services (reuse):
  - `OfflineCacheService` (IndexedDB/localStorage), `OfflineQueueService`, `OfflineSyncManager`, `applyNoteOverlay`.

## Design Decisions
**Why did we choose this approach?**

- Offline-first: автосейвы всегда идут через локальный кеш + очередь; SyncManager отвечает за синхронизацию/компактацию/retry.
- Debounce + throttling (1.5 с, не чаще 1 раз в 2 с) — баланс между UX и размером очереди.
- Partial payload + clientUpdatedAt уменьшают объём очереди/кеша и ускоряют обработку.
- LWW сохраняется как конфликт-стратегия; сервис уже ожидает её.

## Non-Functional Requirements
**How should the system perform?**

- Перфоманс: автосейв (формирование partial + запись в кеш/очередь) не должен блокировать UI; сериализация partial должна занимать ≤ несколько мс; debounce ограничивает частоту (не чаще 1/2 с).
- Надёжность: офлайн поддерживает ≥100 автосейвов (compaction/enforceLimit), восстановление после рефреша/закрытия.
- UX: статус Saving…/Saved без мерцаний (≥500 мс видимости), ввод не блокируется.
- Безопасность: нет новых эндпоинтов/секретов; доступ через текущий Supabase/RLS; сохраняем существующие проверки ввода/санитизацию.

