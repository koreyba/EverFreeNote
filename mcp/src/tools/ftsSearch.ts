import { getSupabaseClient, getUserId } from "../supabaseClient.js";
import {
  detectLanguage,
  buildTsQuery,
  ftsLanguage,
  type LanguageCode,
} from "@core/utils/search";
import type { FtsSearchResult } from "@/supabase/types";

// Tool definition for MCP protocol
export const FTS_SEARCH_TOOL = {
  name: "search_notes_fts",
  description:
    "Full-text keyword search across all notes (works on all notes, not just indexed ones). " +
    "Supports Russian and English. Returns keyword matches with highlighted snippets.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search keywords (minimum 3 characters)",
        minLength: 3,
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (1-100)",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
      tag: {
        type: "string",
        description: "Filter by tag (optional)",
      },
    },
    required: ["query"],
  },
};

type FtsSearchArgs = {
  query: string;
  limit?: number;
  tag?: string;
};

export async function ftsSearch(args: FtsSearchArgs): Promise<string> {
  const { query, limit = 20, tag } = args;

  if (query.trim().length < 3) {
    return "Query must be at least 3 characters long.";
  }

  const supabase = getSupabaseClient();

  try {
    const userId = await getUserId();

    // Detect language (Russian or English) and build PostgreSQL ts_query format
    // The search utils handle tokenization and stemming appropriate for each language
    const language = detectLanguage(query);
    const tsQuery = buildTsQuery(query);

    if (!tsQuery) {
      return "Invalid search query. Please use at least 3 characters.";
    }

    const ftsLang = ftsLanguage(language as LanguageCode);

    // Call the PostgreSQL full-text search RPC function
    // Results include rank (relevance score) and headline (highlighted snippet)
    const { data, error } = await supabase.rpc("search_notes_fts", {
      search_query: tsQuery,
      search_language: ftsLang,
      min_rank: 0.01,
      result_limit: limit,
      result_offset: 0,
      search_user_id: userId,
      filter_tag: tag ?? null,
    });

    if (error) {
      return `Error: ${error.message}`;
    }

    const results = (data ?? []) as FtsSearchResult[];

    if (results.length === 0) {
      if (tag) {
        return `No results found for "${query}" with tag "${tag}".`;
      }
      return `No results found for "${query}".`;
    }

    const lines: string[] = [];
    if (tag) {
      lines.push(
        `Found ${results.length} result(s) for "${query}" with tag "${tag}":\n`,
      );
    } else {
      lines.push(`Found ${results.length} result(s) for "${query}":\n`);
    }

    for (const [index, result] of results.entries()) {
      const tagsStr =
        result.tags.length > 0 ? `tags: ${result.tags.join(", ")}` : "no tags";

      lines.push(
        `${index + 1}. "${result.title}" (rank: ${result.rank.toFixed(2)}, ${tagsStr})`,
      );
      if (result.headline) {
        // headline contains text snippets with <b> tags around matches (shown as-is for plain text)
        lines.push(`   ${result.headline}`);
      }
      lines.push(`   ID: ${result.id}`);
      lines.push("");
    }

    return lines.join("\n");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return `Error performing full-text search: ${errorMsg}`;
  }
}
