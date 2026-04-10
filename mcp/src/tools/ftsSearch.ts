import { getSupabaseClient, getUserId } from "../supabaseClient.js";
import {
  detectLanguage,
  buildTsQuery,
  ftsLanguage,
  type LanguageCode,
} from "@core/utils/search";
import type { FtsSearchResult } from "@/supabase/types";
import { formatTags } from "../helpers/formatTags.js";

// Minimum query length required for full-text search to be effective
const MIN_QUERY_LENGTH = 3;

// Minimum rank threshold filters out extremely weak matches (0.01 = 1%)
// while keeping most relevant results. PostgreSQL's ts_rank typically returns
// values between 0 (no match) and 1 (perfect match).
const MIN_RANK_THRESHOLD = 0.01;

// Default limit for search results - enough to be useful without overwhelming
const DEFAULT_LIMIT = 20;

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
        description: `Maximum number of results to return (1-100). Default: ${DEFAULT_LIMIT}`,
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

/**
 * Build a user-friendly message when no search results are found.
 */
function buildNoResultsMessage(query: string, tag?: string): string {
  if (tag) {
    return `No results found for "${query}" with tag "${tag}".`;
  }
  return `No results found for "${query}".`;
}

/**
 * Format FTS search results into a readable text response.
 * Each result includes rank (relevance score) and a highlighted snippet.
 */
function formatFtsResults(
  results: FtsSearchResult[],
  query: string,
  tag?: string,
): string {
  const lines: string[] = [];

  if (tag) {
    lines.push(
      `Found ${results.length} result(s) for "${query}" with tag "${tag}":\n`,
    );
  } else {
    lines.push(`Found ${results.length} result(s) for "${query}":\n`);
  }

  for (const [index, result] of results.entries()) {
    const tagsStr = formatTags(result.tags);

    lines.push(
      `${index + 1}. "${result.title}" (rank: ${result.rank.toFixed(2)}, ${tagsStr})`,
    );

    if (result.headline) {
      // Headline contains PostgreSQL ts_headline output with <b> tags highlighting matches
      lines.push(`   ${result.headline}`);
    }

    lines.push(`   ID: ${result.id}`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function ftsSearch(args: FtsSearchArgs): Promise<string> {
  const { query, limit = DEFAULT_LIMIT, tag } = args;

  if (query.trim().length < MIN_QUERY_LENGTH) {
    return `Query must be at least ${MIN_QUERY_LENGTH} characters long.`;
  }

  const supabase = getSupabaseClient();

  try {
    const userId = await getUserId();

    // Detect language (Russian or English) to apply appropriate text search configuration.
    // The search utils handle tokenization, stemming, and stop words for each language.
    const language = detectLanguage(query);
    const tsQuery = buildTsQuery(query);

    if (!tsQuery) {
      return `Invalid search query. Please use at least ${MIN_QUERY_LENGTH} characters.`;
    }

    const ftsLang = ftsLanguage(language as LanguageCode);

    // Call the PostgreSQL full-text search RPC function defined in the database.
    // Results include rank (relevance score) and headline (highlighted snippet with <b> tags).
    const { data, error } = await supabase.rpc("search_notes_fts", {
      search_query: tsQuery,
      search_language: ftsLang,
      min_rank: MIN_RANK_THRESHOLD,
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
      return buildNoResultsMessage(query, tag);
    }

    return formatFtsResults(results, query, tag);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return `Error performing full-text search: ${errorMsg}`;
  }
}
