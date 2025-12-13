---
phase: testing
title: Тестирование оффлайн-режима
description: Подход, сценарии и покрытие
---

# Стратегия тестирования

## Цели
- Юнит: cache/queue/sync, overlay — максимально полно (целевая часть core).
- Интеграция: оффлайн→очередь→overlay→онлайн синк (успех/failed), лимит кеша.
- E2E (web): оффлайн CRUD, перезапуск, автосинк.

## Юнит-тесты
- OfflineStorageAdapter (IndexedDB, можно мок/stub): CRUD, popQueueBatch, enforceLimit (LRU/updated_at).
- OfflineQueueService: enqueue/dequeue/markStatus, сортировка по clientUpdatedAt.
- OfflineCacheService: save/load/delete, enforceLimit.
- OfflineSyncManager: drainQueue (успех/ошибка), onSuccess cleanup, retry/backoff (как минимум подсчёт попыток/вызов markStatus).
- Overlay: applyNoteOverlay — перекрытие оффлайн-версий, отсутствие дубликатов.

## Интеграционные
- Оффлайн update/create/delete: запись в очередь + кеш, overlay сразу отображает изменения.
- Перезапуск: после перезагрузки контроллера overlay/pending/failed восстанавливаются из хранилища.
- Онлайн синк: очередь уходит в Supabase-мутации (моки), onSuccess очищает кеш/overlay и уменьшает pending/failed.
- Ошибки синка: mark failed, остаётся в overlay (pending/failed), повтор при следующем online.
- Лимит кеша: при переполнении удаляются старые записи (LRU/updatedAt).

## E2E (web)
- Открыть оффлайн, создать/изменить/удалить заметку, перезапустить — увидеть изменения; вернуться online — синк прошёл, overlay очищен.
- Множественные правки в оффлайне → online: все уходят, UI без дубликатов.
- Удаление в оффлайне: карточка исчезает, после онлайн — удалена на сервере.

## Отчётность
- CI: `npm run type-check`, `npm run eslint`, компонентные/интеграционные тесты, e2e (web) для ключевых сценариев.
- Покрытие: core offline modules приоритетно; UI-хуки — smoke/интеграция.
- Ручная проверка: баннер оффлайна, лейблы pending/failed, корректный overlay/перезапуск.
