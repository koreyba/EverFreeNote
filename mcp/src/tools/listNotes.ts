import { getSupabaseClient } from "../supabaseClient.js";

// Tool definition for MCP protocol
export const LIST_NOTES_TOOL = {
  name: "list_notes",
  description:
    "List notes with optional tag filtering. Returns note summaries (title, tags, update date) without full content. " +
    "Use read_note to get the full content of a specific note.",
  inputSchema: {
    type: "object",
    properties: {
      tag: {
        type: "string",
        description: "Filter by tag (optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of notes to return (1-100)",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
    },
    required: [],
  },
};

type ListNotesArgs = {
  tag?: string;
  limit?: number;
};

export async function listNotes(args: ListNotesArgs): Promise<string> {
  const { tag, limit = 20 } = args;

  const supabase = getSupabaseClient();

  try {
    // Query notes table, filtering by tag if provided
    // Results are automatically scoped to the authenticated user via RLS
    let query = supabase
      .from("notes")
      .select("id, title, tags, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) {
      return `Error: ${error.message}`;
    }

    const notes = data ?? [];

    if (notes.length === 0) {
      if (tag) {
        return `No notes found with tag "${tag}".`;
      }
      return "No notes found. Create some notes in EverFreeNote first!";
    }

    const lines: string[] = [];
    if (tag) {
      lines.push(`Found ${notes.length} note(s) with tag "${tag}":\n`);
    } else {
      lines.push(`Found ${notes.length} note(s):\n`);
    }

    for (const [index, note] of notes.entries()) {
      const tagsStr =
        note.tags.length > 0 ? `tags: ${note.tags.join(", ")}` : "no tags";
      const date = new Date(note.updated_at).toISOString().split("T")[0];

      lines.push(
        `${index + 1}. "${note.title}" (${tagsStr}) — updated ${date}`,
      );
      lines.push(`   ID: ${note.id}`);
    }

    return lines.join("\n");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return `Error listing notes: ${errorMsg}`;
  }
}
