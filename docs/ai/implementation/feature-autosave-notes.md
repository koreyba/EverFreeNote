---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Reuse существующий dev env (`npm install`, `npm run dev`).
- Убедиться, что IndexedDB доступен в браузере; fallback на localStorage покрыт адаптером.

## Code Structure
**How is the code organized?**

- UI: `ui/web/components/features/notes/NoteEditor.tsx`, `RichTextEditor.tsx`, `NotesShell`/`NoteList`.
- Controller: `ui/web/hooks/useNoteAppController.ts`.
- Offline: `OfflineCacheService`, `OfflineQueueService`, `OfflineSyncManager`, `applyNoteOverlay`.
- Debounce util: `useDebouncedCallback`.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Автосейв (debounce 1–2 c) в title/tags/body: вызывает handler контроллера с partial payload + clientUpdatedAt.
- Handler: saveNote в OfflineCacheService (partial), обновить overlay (applyNoteOverlay), enqueue в OfflineQueueService (operation update), не дергать прямые мутации.
- SyncManager сам дренирует; не вызывать drain вручную.
- Save button: состояние Saving… пока автосейв выполняется/в очереди (pending), затем “Saved”.

### Patterns & Best Practices
- Partial payload (только изменённые поля), clientUpdatedAt обязательный.
- Debounce через `useDebouncedCallback`.
- Не пересохранять без изменений (сравнивать last saved content).

## Integration Points
**How do pieces connect?**

- NoteEditor → controller handler → cache + queue → overlay → UI обновляется.
- OfflineSyncManager → Supabase mutations, обновляет cache/overlay via onSuccess (уже есть).

## Error Handling
**How do we handle failures?**

- enqueue errors: fallback toast? минимум — лог + инкремент failedCount.
- Sync failures уже помечаются status failed; UI показывает failedCount.
- Локальная запись: try/catch вокруг cache.saveNote; не блокировать ввод.

## Performance Considerations
**How do we keep it fast?**

- Debounce снижает частоту; partial payload минимизирует сериализацию.
- Не пересобирать крупные HTML строки без изменений (контент equality check).
- Полагаться на compaction + enforceLimit в storage.

## Security Notes
**What security measures are in place?**

- Нет новых секретов/эндпоинтов; RLS на Supabase прежний.
- Санитизация контента уже в редакторе; автосейв не добавляет внешних вводов.

