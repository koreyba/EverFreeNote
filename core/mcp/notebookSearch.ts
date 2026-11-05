import { z } from 'zod'
import { buildExcerpt } from './noteContent.ts'

const timestamp = z.iso.datetime({ offset: true }).refine(value => (value.match(/\.(\d+)/)?.[1].length ?? 0) <= 6, 'Use at most six fractional second digits')

function timestampMicros(value: string): bigint {
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0')
  return BigInt(Date.parse(value)) * 1000n + BigInt(fraction.slice(3, 6))
}
export const notebookSearchInputShape = {
  query: z.string().trim().min(1).max(200).describe('Natural text; text search also supports quoted phrases, OR and excluded words'),
  mode: z.enum(['text', 'semantic', 'hybrid']).default('text').describe('Text is free; semantic/hybrid use the owner’s Gemini index and quota'),
  tags: z.array(z.string().trim().min(1).max(100)).max(20).default([]).describe('Case-insensitive tag filters'),
  tag_match: z.enum(['all', 'any']).default('all'),
  created_after: timestamp.optional().describe('Inclusive creation time with timezone offset'),
  created_before: timestamp.optional().describe('Exclusive creation time with timezone offset'),
  updated_after: timestamp.optional().describe('Inclusive last-update time with timezone offset'),
  updated_before: timestamp.optional().describe('Exclusive last-update time with timezone offset'),
  sort: z.enum(['relevance', 'updated_at', 'created_at']).default('relevance').describe('Relevance descending or newest timestamps first; ids break ties'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(100_000).default(0),
  min_similarity: z.number().min(0).max(1).optional(),
}
export const notebookSearchInputSchema = z.object(notebookSearchInputShape).superRefine((input, ctx) => {
  for (const [after, before] of [[input.created_after, input.created_before], [input.updated_after, input.updated_before]]) {
    if (after && before && Number.isFinite(Date.parse(after)) && Number.isFinite(Date.parse(before)) && timestampMicros(after) >= timestampMicros(before)) ctx.addIssue({ code: 'custom', message: 'Date lower bound must be earlier than upper bound' })
  }
})
export type NotebookSearchInput = z.infer<typeof notebookSearchInputSchema>

export const rankedNoteSchema = z.object({
  id: z.string(), title: z.string(), tags: z.array(z.string()),
  created_at: z.string().nullable(), updated_at: z.string().nullable(),
  excerpt: z.string(), score: z.number(),
})
export const notebookSearchOutputShape = {
  notes: z.array(rankedNoteSchema), total: z.number().int().nonnegative(), has_more: z.boolean(),
  mode: z.enum(['text', 'semantic', 'hybrid']), warnings: z.array(z.string()).optional(),
}
export type NotebookSearchResult = { notes: z.infer<typeof rankedNoteSchema>[]; total: number; has_more: boolean; mode: NotebookSearchInput['mode']; warnings?: string[] }
export type NotebookSemanticSearchOutcome = { status: 'ok'; result: NotebookSearchResult } | { status: 'unavailable'; message: string }
export interface NotebookSemanticSearch { searchNotes(input: NotebookSearchInput): Promise<NotebookSemanticSearchOutcome> }

/** Shared wire contract: database snippets may contain HTML, MCP excerpts never do. */
export function mapNotebookSearchResult(body: unknown): NotebookSearchResult {
  const rawSchema = z.object({ ...notebookSearchOutputShape, notes: z.array(rankedNoteSchema.omit({ excerpt: true }).extend({ excerpt_html: z.string() })) })
  const parsed = rawSchema.parse(body)
  return { ...parsed, notes: parsed.notes.map(({ excerpt_html, ...note }) => ({ ...note, excerpt: buildExcerpt(excerpt_html, 300) })) }
}

export function notebookSearchRpcParams(input: NotebookSearchInput) {
  return {
    query_text: input.query, search_mode: input.mode,
    tag_filters: input.tags, tag_match: input.tag_match,
    created_after: input.created_after ?? null, created_before: input.created_before ?? null,
    updated_after: input.updated_after ?? null, updated_before: input.updated_before ?? null,
    sort_by: input.sort, result_limit: input.limit, result_offset: input.offset,
    min_similarity: input.min_similarity ?? 0.55,
  }
}
