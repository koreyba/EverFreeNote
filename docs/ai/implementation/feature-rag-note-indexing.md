---
phase: implementation
title: RAG Note Indexing — Implementation Guide (POC)
description: Технические детали реализации POC скрипта
---

# RAG Note Indexing — Implementation Guide (POC)

## Development Setup

### Prerequisites

- Node.js 20+
- Supabase project с включённым pgvector
- Gemini API ключ
- Применённые миграции (см. ниже)

### Установка зависимостей

```bash
cd scripts/rag-poc
npm install
cp .env.example .env
# Заполни .env своими ключами
```

### Переменные окружения

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings > API > service_role
GEMINI_API_KEY=AIza...
RAG_USER_ID=uuid-пользователя      # ID твоего аккаунта в Supabase
```

## Структура файлов

```
scripts/rag-poc/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── config.ts             ← ВСЕ настраиваемые параметры (модели, индекс, лимиты)
├── index.ts              ← запуск: npx ts-node index.ts
├── query.ts              ← запуск: npx ts-node query.ts "вопрос"
└── lib/
    ├── supabase.ts       ← createClient с service_role
    ├── html-utils.ts     ← stripHtml(html: string): string
    └── embeddings.ts     ← getEmbedding(text: string): number[]
```

## Implementation Notes

### `config.ts` — единое место для всех параметров

Все настраиваемые параметры собраны здесь. Менять только этот файл при тюнинге.

```typescript
export const RAG_CONFIG = {
  // --- Embedding ---
  embeddingModel: 'text-embedding-004', // Gemini модель для эмбедингов
  embeddingDimensions: 768,             // Размерность вектора (должна совпадать с БД)

  // --- LLM ---
  llmModel: 'gemini-2.0-flash',         // Gemini модель для генерации ответа
  llmTemperature: 0.2,                  // Низкая температура = более точные ответы

  // --- Поиск ---
  matchCount: 5,                        // Сколько заметок брать для контекста

  // --- Индексирование ---
  batchSize: 10,                        // Заметок за один вызов embedDocuments
  batchDelayMs: 200,                    // Задержка между батчами (rate limit)
  maxContentChars: 8000,                // Обрезать контент заметки до этой длины

  // --- pgvector HNSW индекс (только для справки, применяется в миграции) ---
  hnswM: 16,                            // Кол-во связей между узлами
  hnswEfConstruction: 64,               // Точность построения индекса
} as const
```

> **Почему именно эти значения?**
> - `text-embedding-004` — лучшая актуальная Gemini embedding модель (768 dims)
> - `gemini-2.0-flash` — быстрая, дешёвая, с хорошим качеством для RAG
> - `temperature: 0.2` — снижаем "фантазию" LLM, хотим факты из заметок
> - `matchCount: 5` — баланс между контекстом и длиной prompt
> - `hnsw(m=16, ef_construction=64)` — рекомендованные параметры для точного семантического поиска

### Зависимости (`package.json`)

```json
{
  "dependencies": {
    "@langchain/google-genai": "^0.1.0",
    "@langchain/community": "^0.3.0",
    "@supabase/supabase-js": "^2.0.0",
    "node-html-parser": "^6.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### `lib/html-utils.ts` — стрипаем HTML

Используем `node-html-parser` (легковесный, без DOM, работает в Node):

```typescript
import { parse } from 'node-html-parser'

export function stripHtml(html: string): string {
  if (!html) return ''
  const root = parse(html)
  return root.textContent.replace(/\s+/g, ' ').trim()
}
```

### `lib/supabase.ts` — клиент

```typescript
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### `lib/embeddings.ts` — Gemini embeddings

```typescript
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { RAG_CONFIG } from '../config'
import 'dotenv/config'

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY!,
  modelName: RAG_CONFIG.embeddingModel,
})
```

### `index.ts` — индексирование

Ключевые шаги:
1. Fetch заметок: `supabase.from('notes').select('id, title, description').eq('user_id', userId)`
2. Для каждой заметки: `stripHtml(description)` → `[title]\n\n[text]`
3. Batch embedding через `embeddings.embedDocuments([...])`
4. Upsert в `note_embeddings` (by `note_id`)
5. Throttle: 200ms между батчами (10 заметок), чтобы не упереться в rate limit

### `query.ts` — запрос

1. Взять аргумент: `const question = process.argv[2]`
2. Эмбедить: `const vector = await embeddings.embedQuery(question)`
3. Similarity search: вызов `match_notes` RPC
4. Prompt template:
   ```
   Ты — помощник, который отвечает на вопросы по личным заметкам пользователя.

   Контекст из заметок:
   ---
   {context}
   ---

   Вопрос: {question}

   Отвечай на основе предоставленных заметок. Если информации недостаточно, скажи об этом.
   ```
5. Вызвать `ChatGoogleGenerativeAI` с моделью `gemini-1.5-flash`
6. Вывести ответ + источники (title заметок)

## Supabase Migrations

### Миграция 1: `note_embeddings` таблица

Файл: `supabase/migrations/20260302000000_add_note_embeddings.sql`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.note_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  embedding  vector(768) NOT NULL,
  indexed_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS note_embeddings_note_id_idx
  ON public.note_embeddings (note_id);

CREATE INDEX IF NOT EXISTS note_embeddings_user_id_idx
  ON public.note_embeddings (user_id);

CREATE INDEX IF NOT EXISTS note_embeddings_vector_idx
  ON public.note_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Миграция 2: `match_notes` RPC

Файл: `supabase/migrations/20260302000001_add_match_notes_function.sql`

```sql
CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(768),
  match_user_id   uuid,
  match_count     int DEFAULT 3
)
RETURNS TABLE (
  note_id    uuid,
  content    text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    note_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Error Handling

- Gemini API errors: логировать и пропускать заметку (не останавливать индексирование)
- Supabase errors: бросать исключение с понятным сообщением
- Пустой контент (после strip): пропускать заметку, логировать warning
- Rate limit: поймать 429 ответ, подождать 60s, повторить

## Known Limitations (POC)

- Один вектор на заметку (нет чанкинга) — длинные заметки обрезаются
- Нет инкрементального обновления — повторный запуск переиндексирует всё
- Нет поддержки изображений в заметках
- `service_role` key только в локальном скрипте, не деплоить
