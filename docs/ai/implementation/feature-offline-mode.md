---
phase: implementation
title: Гайд по реализации оффлайн-режима
description: Шаги, соглашения и интеграция
---

# Реализация

## Хранилище и очередь
- Web: IndexedDB адаптер (`ui/web/adapters/offlineStorage.ts`), fallback на localStorage. Оцениваем размер по JSON, чистим по давности (LRU/updatedAt). Stores: `notes`, `queue`.
- Очередь: `OfflineQueueService` (enqueue/pop/markStatus), `MutationQueueItem` хранит op/payload/clientUpdatedAt/status.
- Кеш: `OfflineCacheService` (load/save/delete, enforceLimit).

## Overlay и UI
- Overlay cached notes поверх серверных (`applyNoteOverlay`): оффлайн правки сразу видны в списке/деталях, восстановление после рестарта.
- Контроллер (`useNoteAppController`):
  - При оффлайн create/update/delete сохраняет в кеш и очередь, обновляет selectedNote и overlay, считает pending/failed.
  - При online через SyncManager очищает кеш/overlay по onSuccess, пересчитывает pending/failed.
  - Sidebar показывает оффлайн-баннер + лейблы pending/failed.

## Синхронизация
- `OfflineSyncManager`: drainQueue батчами, retry/backoff (задача адаптера), onSuccess callback удаляет из кеша/overlay, обновляет счетчики.
- Триггеры: при online (NetworkStatusProvider) вызывается drainQueue; TODO: таймер/доп. триггеры при необходимости.

## Политика конфликтов
- last-write-wins (updated_at); при конфликте создаётся копия заметки (адаптация потребует доработки на уровне Supabase/mutations при обнаружении конфликта).

## Поведение при перезапуске
- Очередь и кеш читаются при инициализации контроллера → pending/failed/overlay восстанавливаются.

## Что остаётся сделать
- Mobile адаптер (SQLite/AsyncStorage + NetInfo) — TODO.
- Более точная оценка размера в IndexedDB (без JSON roundtrip).
- Доп. индикация прогресса синка/ошибок — по необходимости.
