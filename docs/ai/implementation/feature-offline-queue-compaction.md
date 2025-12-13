---
phase: implementation
title: Реализация compactQueue для офлайн-очереди
description: Кодовое изменение: схлопывание очереди перед синхронизацией и новый API очереди.
---

## Что сделано
- **core/utils/compactQueue.ts** — реализована функция схлопывания по правилам из дизайна, сортировка по `clientUpdatedAt`, все элементы переводятся в `pending`.
- **core/services/offlineQueue.ts** — добавлен метод `upsertQueue(items)` для перезаписи очереди после компакта.
- **core/services/offlineSyncManager.ts** — перед дренажем вызывает `compactQueue` и при изменениях сохраняет сжатую очередь, далее обрабатывает pending-партию как раньше.

## Проверки
- Типы проходят `npm run type-check`.
- ESLint: `npm run eslint` без предупреждений.

## TODO / не входит в объём
- Мобильный storage-адаптер: должен также поддерживать `upsertQueue`, но находится в другом скопе.
- Тесты на компактор и синк-менеджер — пока отсутствуют (см. планирование offline-mode/testing).
