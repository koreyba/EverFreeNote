import { getSupabaseClient } from "../supabaseClient.js";
import { formatTags } from "../helpers/formatTags.js";

// Tool definition for MCP protocol
export const SEARCH_NOTES_TOOL = {
  name: "search_notes",
  description:
    "Search notes by meaning using AI embeddings. Only works on notes that have been indexed in the EverFreeNote UI. " +
    "Returns relevant text chunks ranked by similarity. Requires a Gemini API key to be configured in Settings → Google API.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language search query",
      },
      topK: {
        type: "number",
        description: "Maximum number of chunks to return (1-100)",
        default: 15,
        minimum: 1,
        maximum: 100,
      },
      threshold: {
        type: "number",
        description: "Minimum similarity score (0-1)",
        default: 0.55,
        minimum: 0,
        maximum: 1,
      },
      filterTag: {
        type: "string",
        description: "Filter results to notes with this tag (optional)",
      },
    },
    required: ["query"],
  },
};

type SearchNotesArgs = {
  query: string;
  topK?: number;
  threshold?: number;
  filterTag?: string;
};

type RagChunk = {
  chunk_id: string;
  note_id: string;
  note_title: string;
  note_tags: string[];
  chunk_body_text: string;
  similarity: number;
};

type RagSearchResponse = {
  chunks?: RagChunk[];
  error?: string;
};

export async function searchNotes(args: SearchNotesArgs): Promise<string> {
  // Default topK=15 provides a good balance between result quality and response size.
  // Default threshold=0.55 filters out low-relevance chunks while keeping useful matches.
  const { query, topK = 15, threshold = 0.55, filterTag } = args;

  const supabase = getSupabaseClient();

  try {
    // Call the rag-search Edge Function to perform semantic search.
    // The Edge Function handles Gemini API key decryption, query embedding,
    // and vector similarity search against indexed notes.
    const { data, error } = await supabase.functions.invoke<RagSearchResponse>(
      "rag-search",
      {
        body: {
          query: query.trim(),
          topK,
          threshold,
          filterTag: filterTag ?? null,
        },
      },
    );

    if (error) {
      return `Error: ${error.message}`;
    }

    if (data?.error) {
      // Edge Function returns errors as { error: string } in the response body
      // rather than throwing, so we check data.error separately.
      if (data.error.includes("Gemini API key not configured")) {
        return (
          "Gemini API key not configured. Please add your Gemini API key in EverFreeNote Settings → Google API.\n\n" +
          "Semantic search requires a Gemini API key to generate embeddings. " +
          "You can use the search_notes_fts tool for keyword-based search instead."
        );
      }
      return `Error: ${data.error}`;
    }

    const chunks = data?.chunks ?? [];

    if (chunks.length === 0) {
      return (
        "No relevant chunks found.\n\n" +
        "This could mean:\n" +
        '  • No notes have been indexed yet (use the "Index note" button in EverFreeNote UI)\n' +
        "  • The query similarity is below the threshold\n" +
        "  • No notes match the filter criteria\n\n" +
        "Try using search_notes_fts for keyword-based search instead."
      );
    }

    return formatSearchResults(chunks);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return `Error calling rag-search: ${errorMsg}`;
  }
}

/**
 * Format search results grouped by note.
 * Groups chunks by note_id and presents them in a readable format for LLM consumption.
 */
function formatSearchResults(chunks: RagChunk[]): string {
  // Group chunks by note_id to show all matching chunks from the same note together
  const noteGroups = new Map<string, RagChunk[]>();
  for (const chunk of chunks) {
    const existing = noteGroups.get(chunk.note_id) ?? [];
    existing.push(chunk);
    noteGroups.set(chunk.note_id, existing);
  }

  // Format output
  const lines: string[] = [];
  lines.push(
    `Found ${noteGroups.size} relevant note(s) (${chunks.length} chunk(s)):\n`,
  );

  for (const noteChunks of noteGroups.values()) {
    const firstChunk = noteChunks[0];
    const tagsStr = formatTags(firstChunk.note_tags);

    lines.push(`=== Note: "${firstChunk.note_title}" (${tagsStr}) ===`);

    for (const [index, chunk] of noteChunks.entries()) {
      lines.push(
        `[Chunk ${index + 1}, similarity: ${chunk.similarity.toFixed(2)}]`,
      );
      lines.push(chunk.chunk_body_text.trim());
      lines.push(""); // Empty line between chunks
    }

    lines.push(""); // Empty line between notes
  }

  return lines.join("\n");
}
