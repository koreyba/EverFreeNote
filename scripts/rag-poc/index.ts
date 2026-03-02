import 'dotenv/config'
import { supabase } from './lib/supabase'
import { embeddings } from './lib/embeddings'
import { stripHtml } from './lib/html-utils'
import { RAG_CONFIG } from './config'

const userId = process.env.RAG_USER_ID
if (!userId) throw new Error('Missing RAG_USER_ID in .env')

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Fetching notes...')

  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, title, description')
    .eq('user_id', userId)
    .limit(5) // POC: index only 5 notes

  if (error) throw new Error(`Failed to fetch notes: ${error.message}`)
  if (!notes || notes.length === 0) {
    console.log('No notes found for this user.')
    return
  }

  console.log(`Found ${notes.length} notes. Starting indexing...\n`)

  // Filter out notes with no usable content
  const indexable = notes.filter(n => {
    const text = stripHtml(n.description ?? '')
    if (!text) {
      console.warn(`[SKIP] Empty content: "${n.title}"`)
      return false
    }
    return true
  })

  console.log(`Indexing ${indexable.length} notes (${notes.length - indexable.length} skipped).\n`)

  // Process in batches
  for (let i = 0; i < indexable.length; i += RAG_CONFIG.batchSize) {
    const batch = indexable.slice(i, i + RAG_CONFIG.batchSize)

    const texts = batch.map(n => {
      const plain = stripHtml(n.description ?? '')
      return `${n.title}\n\n${plain}`
    })

    let vectors: number[][]
    try {
      vectors = await embeddings.embedDocuments(texts)
    } catch (err) {
      console.error(`[ERROR] Embedding batch ${i}–${i + batch.length - 1} failed:`, err)
      continue
    }

    // Upsert embeddings (unique index on note_id handles deduplication)
    const rows = batch.map((n, j) => ({
      note_id: n.id,
      user_id: userId,
      content: texts[j],
      embedding: vectors[j],
    }))

    // NOTE: This POC uses the original single-embedding schema (unique on note_id).
    // The production schema (migration 20260302000002) is chunked (unique on note_id, chunk_index).
    // This script is not compatible with the current production schema and is kept for reference only.
    const { error: upsertError } = await supabase
      .from('note_embeddings')
      .upsert(rows, { onConflict: 'note_id' })

    if (upsertError) {
      console.error(`[ERROR] Upsert failed for batch starting at ${i}:`, upsertError.message)
      continue
    }

    for (let j = 0; j < batch.length; j++) {
      console.log(`[${i + j + 1}/${indexable.length}] Indexed: "${batch[j].title}"`)
    }

    // Rate limit guard between batches
    if (i + RAG_CONFIG.batchSize < indexable.length) {
      await sleep(RAG_CONFIG.batchDelayMs)
    }
  }

  console.log('\nDone. All notes indexed.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
