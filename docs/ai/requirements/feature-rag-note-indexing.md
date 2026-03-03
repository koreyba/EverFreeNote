---
phase: requirements
title: RAG Note Indexing
description: Requirements for per-note indexing, retrieval, and UI controls
---

# RAG Note Indexing

## Problem Statement

- FTS не покрывает семантический поиск: пользователь помнит смысл, но не точные слова.
- Нужно быстро индексировать заметки в векторное хранилище и безопасно использовать их в RAG-потоке.
- Пользователь должен понимать статус индексации по конкретной заметке и управлять им из UI.

## Goals

- Индексация заметки в чанки и эмбеддинги через Supabase Edge Function `rag-index`.
- Действия из UI: `index`, `reindex`, `delete`.
- Автоматическое переиндексирование после изменения контента (debounced autosave path).
- Изоляция данных между пользователями (RLS + фильтрация по `user_id`).
- Production-ready поведение: отказоустойчивость, идемпотентность и наблюдаемость ошибок.

## In Scope

- UI-интеграция в `NoteEditor` и `NoteView` (кнопки и статус RAG индекса).
- Вызовы `supabase.functions.invoke('rag-index', { body: { noteId, action } })`.
- Chunked indexing (несколько векторов на заметку) и хранение в `note_embeddings`.
- Multi-user support с обязательной защитой доступа к `note_embeddings`.
- Деплой в staging/production с миграциями и секретами Edge Function.

## Out of Scope

- Индексация вложений/изображений/OCR.
- Кросс-проектный/глобальный knowledge graph.
- Offline inference на устройстве.

## Success Criteria

- [ ] Для заметки корректно работает `index`/`reindex`/`delete` без рассинхронизации UI.
- [ ] После изменения заметки индекс обновляется автоматически и не теряет данные при transient ошибках.
- [ ] Таблица `note_embeddings` недоступна посторонним пользователям (проверено RLS).
- [ ] Edge Function не логирует чувствительные upstream payloads и корректно обрабатывает retries/timeouts.

## Constraints & Assumptions

- Embeddings: `models/gemini-embedding-001` с `outputDimensionality=1536`.
- Индекс хранится в `public.note_embeddings` с chunk-level структурой (`chunk_index`, `char_offset`, `content`, `embedding`).
- Сервисный ключ Supabase хранится только в secrets Edge Function, не в web `.env`.
- Клиентские действия выполняются через аутентифицированную Supabase-сессию.
