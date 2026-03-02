# RAG POC — Выводы и находки

> Дата: 2026-03-02 | Ветка: `features/mvp-vector-ai-data`

## Что работает

Полный RAG pipeline подтверждён:
```
HTML заметки → plain text → Gemini embedding → pgvector → similarity search → Gemini LLM → ответ
```

---

## Модели

### Embeddings

| Модель | Статус | Dims | Примечание |
|--------|--------|------|-----------|
| `text-embedding-004` | ❌ Недоступна | 768 | Не входит в набор моделей для данного API ключа |
| `models/gemini-embedding-001` | ✅ Работает | **3072** | Единственная доступная embedding модель |

### LLM (генерация ответа)

| Модель | Статус | Примечание |
|--------|--------|-----------|
| `gemini-2.0-flash` | ❌ Quota = 0 | Недоступна на данном API ключе / проекте |
| `gemini-2.0-flash-lite` | ❌ Quota = 0 | То же самое |
| `gemini-2.5-flash` | ✅ Работает | 5 RPM / 20 RPD на free tier |

---

## pgvector и индекс

**Проблема:** HNSW индекс в pgvector поддерживает максимум **2000 измерений**. `gemini-embedding-001` возвращает 3072 — индекс создать нельзя.

**Решение для POC:** Без индекса. pgvector делает точный sequential scan через оператор `<=>`. Для 5–1000 заметок это нормально по скорости.

**Решение для продакшна (на будущее):** использовать параметр `output_dimensionality` при вызове embedding API, чтобы получить ≤ 2000 dims, и тогда HNSW заработает.

---

## Настройки контента

**Проблема:** `gemini-2.5-flash` блокировал промпты с кодом `PROHIBITED_CONTENT` при большом контексте (~5000+ токенов). Отдельные заметки не блокировались — только их комбинация.

**Решение:** Обрезать контент каждой заметки до **500 символов** перед сохранением в `note_embeddings`. Это фиксит блокировку. Компромисс: ответ менее детальный, но рабочий.

---

## Текущие параметры (`config.ts`)

```
embeddingModel:   models/gemini-embedding-001
embeddingDims:    3072
llmModel:         gemini-2.5-flash
llmTemperature:   0.2
matchCount:       3   (заметок в контексте)
maxContentChars:  500 (символов на заметку)
```

---

## Ограничения POC (известные)

1. **Качество embedding хуже** из-за обрезки до 500 символов — в продакшне нужно разделить `maxEmbeddingChars` и `maxContextChars`
2. **Нет векторного индекса** — при тысячах заметок поиск замедлится
3. **LangChain `ChatGoogleGenerativeAI`** не поддерживает `gemini-2.5-flash` (версия 0.1.12) — заменили на прямой `@google/generative-ai` SDK
4. **Индексировано только 5 заметок** из 782 — для реальной проверки качества нужно больше

---

---

## Архитектурные решения (2026-03-02)

### Размерность вектора — изменено на 1536

Принято решение использовать `output_dimensionality: 1536` вместо 3072:

- Потеря качества: ~1–2% (Matryoshka embeddings — первые N dims содержат основную семантику)
- Выгода: HNSW индекс становится доступным (лимит pgvector — 2000 dims)
- Требует: новой миграции + полной реиндексации

### Чанкинг — обязателен

Заметки в EverFreeNote длинные → 1 заметка = 1 вектор даёт плохой recall.

**Принятые параметры:**
- `chunkSize: 1500` символов
- `overlap: 200` символов

**Новая схема `note_embeddings`:**
```sql
note_embeddings (
  id           uuid PK,
  note_id      uuid FK → notes.id ON DELETE CASCADE,
  user_id      uuid FK → auth.users.id ON DELETE CASCADE,
  chunk_index  int NOT NULL,       -- порядковый номер чанка в заметке
  char_offset  int NOT NULL,       -- позиция чанка в исходном тексте (для подсветки в UI)
  content      text,               -- текст чанка (plain text)
  embedding    vector(1536),       -- уменьшено с 3072
  indexed_at   timestamp,
  UNIQUE (note_id, chunk_index)    -- upsert target
)
```

### Что индексировать

`title + content` (plain text, через пробел перед чанкингом). Теги не индексируем.

Пример:
```
"Берлин 2024  Первый день был сложным, мы приехали поздно..."
```

### Устаревшие чанки (стратегия обновления)

Решается в Phase 2 (логика скрипта, схема не меняется):
- При реиндексации заметки: `DELETE FROM note_embeddings WHERE note_id = ?` → вставить новые чанки в транзакции
- `ON DELETE CASCADE` покрывает удаление самой заметки

### Поиск — отдельная фича

Логика агрегации результатов (чанки → заметки, дедупликация) выносится в отдельную задачу.

### RLS — отложено

Пока используем `service_role`. RLS политики добавим когда появится клиентский вызов.

### MCP сервер — запланировано

Планируется MCP сервер поверх RAG инфраструктуры для чата с базой заметок из Claude Desktop:
```
Claude Desktop → MCP tool: search_notes(query) → Supabase pgvector → ответ
```

---

## Итоговая таблица решений Phase 1

| Решение | Значение | Статус |
|---|---|---|
| Размерность вектора | `1536` (output_dimensionality) | ✅ |
| Индекс | HNSW `vector_cosine_ops` | ✅ |
| Чанкинг | 1500 chars, overlap 200 | ✅ |
| Поля схемы | `chunk_index`, `char_offset` | ✅ |
| Что индексировать | title + content | ✅ |
| Метрика | cosine (`<=>`) | ✅ |
| RLS | отложено | ⏸ |
| Стратегия устаревших чанков | delete + reinsert (Phase 2) | ⏸ |

---

## Следующий шаг

Переписать миграции под новую схему:
- `vector(1536)` + `output_dimensionality: 1536` в embeddings
- Поля `chunk_index`, `char_offset`
- HNSW индекс (`vector_cosine_ops`, `m=16`, `ef_construction=64`)
- Обновить `match_notes` RPC под чанки
- Обновить `config.ts` и скрипты индексации
