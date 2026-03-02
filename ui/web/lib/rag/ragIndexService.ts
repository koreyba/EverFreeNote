import type { SupabaseClient } from '@supabase/supabase-js'
import { prepareNoteText, chunkText } from './chunker'
import { embedTexts } from './embeddings'

export async function indexNote(
  noteId: string,
  userId: string,
  serviceClient: SupabaseClient
): Promise<{ chunkCount: number }> {
  // 1. Fetch note
  const { data: note, error: noteError } = await serviceClient
    .from('notes')
    .select('title, description')
    .eq('id', noteId)
    .single()

  if (noteError || !note) {
    throw new Error(`Note not found: ${noteError?.message ?? 'unknown error'}`)
  }

  // 2. Prepare text and chunk
  const text = prepareNoteText(note.title ?? '', note.description ?? '')
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    // Delete any existing index and return
    await deleteNoteIndex(noteId, userId, serviceClient)
    return { chunkCount: 0 }
  }

  // 3. Embed all chunks
  const vectors = await embedTexts(chunks.map(c => c.content))

  // 4. Delete existing chunks atomically before inserting new ones
  const { error: deleteError } = await serviceClient
    .from('note_embeddings')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', userId)

  if (deleteError) throw new Error(`Failed to clear old index: ${deleteError.message}`)

  // 5. Insert new chunks
  const rows = chunks.map((chunk, i) => ({
    note_id: noteId,
    user_id: userId,
    chunk_index: i,
    char_offset: chunk.charOffset,
    content: chunk.content,
    embedding: vectors[i],
  }))

  const { error: insertError } = await serviceClient.from('note_embeddings').insert(rows)
  if (insertError) throw new Error(`Failed to insert chunks: ${insertError.message}`)

  return { chunkCount: chunks.length }
}

export async function deleteNoteIndex(
  noteId: string,
  userId: string,
  serviceClient: SupabaseClient
): Promise<void> {
  const { error } = await serviceClient
    .from('note_embeddings')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete index: ${error.message}`)
}
