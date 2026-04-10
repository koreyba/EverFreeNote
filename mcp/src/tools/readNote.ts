import { getSupabaseClient } from "../supabaseClient.js";
import { stripHtml } from "../helpers/stripHtml.js";

// Tool definition for MCP protocol
export const READ_NOTE_TOOL = {
  name: "read_note",
  description:
    "Read the full content of a specific note by ID. Returns title, tags, dates, and the note body as plain text.",
  inputSchema: {
    type: "object",
    properties: {
      noteId: {
        type: "string",
        description: "UUID of the note to read",
      },
    },
    required: ["noteId"],
  },
};

type ReadNoteArgs = {
  noteId: string;
};

/**
 * Format a note's full details into a readable text response.
 * Includes title, tags, dates, and the note content as plain text.
 */
function formatNoteDetails(note: {
  title: string;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}): string {
  const plainText = stripHtml(note.description ?? "");
  const tagsStr = note.tags.length > 0 ? note.tags.join(", ") : "none";
  const createdDate = new Date(note.created_at).toISOString().split("T")[0];
  const updatedDate = new Date(note.updated_at).toISOString().split("T")[0];

  const lines: string[] = [];
  lines.push(`Title: ${note.title}`);
  lines.push(`Tags: ${tagsStr}`);
  lines.push(`Created: ${createdDate}`);
  lines.push(`Updated: ${updatedDate}`);
  lines.push("");
  lines.push("Content:");
  lines.push(plainText || "(empty note)");

  return lines.join("\n");
}

export async function readNote(args: ReadNoteArgs): Promise<string> {
  const { noteId } = args;

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, description, tags, created_at, updated_at")
      .eq("id", noteId)
      .single();

    if (error) {
      // PGRST116 is PostgREST's standard error code for "no rows returned" when using .single().
      // This can mean the note doesn't exist, or RLS prevents access to it.
      if (error.code === "PGRST116") {
        return `Note not found: ${noteId}\n\nThe note either doesn't exist or you don't have access to it.`;
      }
      return `Error: ${error.message}`;
    }

    return formatNoteDetails(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return `Error reading note: ${errorMsg}`;
  }
}
