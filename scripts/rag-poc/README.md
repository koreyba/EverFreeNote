# RAG POC — Semantic Search over Notes

Proof of concept: index notes via Gemini embeddings and answer questions using RAG.

## Setup

```bash
npm install
cp .env.example .env
# Fill in .env with your keys
```

## Usage

### 1. Index notes

Fetches all notes for `RAG_USER_ID`, converts HTML to plain text, generates embeddings, stores in pgvector.

```bash
npm run index
# or: npx ts-node index.ts
```

### 2. Ask a question

```bash
npm run query -- "What do I know about React hooks?"
# or: npx ts-node query.ts "What do I know about React hooks?"
```

## Configuration

All tunable parameters are in [`config.ts`](./config.ts):
- Embedding model, dimensions
- LLM model, temperature
- Number of results (`matchCount`)
- Batch size and rate limit delay

## Requirements

- Node.js 20+
- Supabase with pgvector extension enabled
- Migrations applied: `20260302000000_add_note_embeddings.sql` and `20260302000001_add_match_notes_function.sql`

## Removal

This is a self-contained POC. To remove: delete this folder and drop the `note_embeddings` table and `match_notes` function from Supabase.
