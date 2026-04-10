# EverFreeNote MCP Server

A read-only Model Context Protocol (MCP) server that lets AI assistants (Claude Desktop, Cursor, etc.) directly query and search your notes in EverFreeNote.

## What It Does

This MCP server turns your EverFreeNote database into a live knowledge source accessible from any MCP-compatible AI tool. You can:

- 🔍 **Semantic search** — Query indexed notes using natural language via Gemini embeddings
- 📝 **Full-text search** — Keyword-based search across all notes (no indexing required)
- 📋 **List notes** — Browse notes with optional tag filtering
- 📖 **Read note** — Retrieve a specific note's full content by ID

**Read-only**: This server does NOT create, update, or delete notes. It only queries your existing notes.

## Prerequisites

- **Node.js** 20+ and npm
- **EverFreeNote account** with some notes
- **Supabase access token** (JWT) from your EverFreeNote session
- **Gemini API key** (optional, only needed for semantic search)

## Installation

1. Navigate to the `mcp/` directory:
   ```bash
   cd mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Getting Your Access Token

Your Supabase access token (JWT) is needed to authenticate with your EverFreeNote account.

### Option 1: Browser Developer Tools (Recommended)

1. Log in to EverFreeNote in your browser
2. Open Developer Tools (F12)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Navigate to **Local Storage** → `https://everfreenote.com` (or your deployment URL)
5. Find the key that contains your Supabase session (usually `sb-<project-ref>-auth-token`)
6. Copy the `access_token` value from the JSON object

### Option 2: Copy from Supabase Client (Future Feature)

A "Copy API Token" button may be added to EverFreeNote Settings in the future.

**Note**: Supabase JWTs typically expire after 1 hour. If tool calls start failing with auth errors, you'll need to refresh the token by logging in again and copying the new token.

## Configuration

### Claude Desktop

1. Open your Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "everfreenote": {
      "command": "node",
      "args": ["/absolute/path/to/everfreenote/mcp/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_ACCESS_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

**Important**:
- Replace `/absolute/path/to/everfreenote` with the full path to your project directory
- Replace `your-project.supabase.co` with your Supabase project URL
- Replace `your-anon-key` with your Supabase anon/public key
- Replace `your-jwt-token-here` with the access token you copied from your browser

3. Restart Claude Desktop

### Cursor

Add to your Cursor settings (`.cursor/mcp.json` or global MCP config):

```json
{
  "mcpServers": {
    "everfreenote": {
      "command": "node",
      "args": ["/absolute/path/to/everfreenote/mcp/src/index.ts"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_ACCESS_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

## Available Tools

### `search_notes` (Semantic / AI Search)

Search notes by meaning using AI embeddings. Only works on notes that have been indexed in the EverFreeNote UI.

**Parameters**:
- `query` (string, required) — Natural language search query
- `topK` (number, optional, default 15) — Max chunks to return (1–100)
- `threshold` (number, optional, default 0.55) — Minimum similarity score (0–1)
- `filterTag` (string, optional) — Filter results to notes with this tag

**Requirements**: Gemini API key must be configured in EverFreeNote Settings → Google API.

**Example**:
```
User: "Search my notes for information about machine learning"
AI: [calls search_notes with query="machine learning"]
```

### `list_notes` (Browse)

List notes with optional tag filtering. Returns summaries without full content.

**Parameters**:
- `tag` (string, optional) — Filter by tag
- `limit` (number, optional, default 20) — Max notes to return (1–100)

**Example**:
```
User: "Show me my recent notes"
AI: [calls list_notes with limit=10]
```

### `read_note` (Full Content)

Read the full content of a specific note by ID.

**Parameters**:
- `noteId` (string, required) — UUID of the note

**Example**:
```
User: "Read note abc-123-def"
AI: [calls read_note with noteId="abc-123-def"]
```

### `search_notes_fts` (Keyword Search)

Full-text keyword search across all notes. Works on all notes (not just indexed ones). Supports Russian and English.

**Parameters**:
- `query` (string, required, min 3 chars) — Search keywords
- `limit` (number, optional, default 20) — Max results (1–100)
- `tag` (string, optional) — Filter by tag

**Example**:
```
User: "Find notes mentioning 'neural networks'"
AI: [calls search_notes_fts with query="neural networks"]
```

## Troubleshooting

### "Unauthorized" or "Failed to authenticate"

- Your access token has expired (Supabase JWTs expire after ~1 hour)
- Solution: Log in to EverFreeNote again and copy a fresh token

### "Gemini API key not configured"

- Semantic search (`search_notes`) requires a Gemini API key
- Solution: Add your Gemini API key in EverFreeNote Settings → Google API
- Alternative: Use `search_notes_fts` for keyword-based search instead

### "No relevant chunks found"

- No notes have been indexed yet
- Solution: Open notes in EverFreeNote UI and click the "Index note" button
- Alternative: Use `search_notes_fts` which works on all notes without indexing

### "Module not found" errors

- Node.js can't find dependencies
- Solution: Run `npm install` in the `mcp/` directory

### Server fails to start

- Check that all three environment variables are set correctly
- Check that the `tsx` package is installed: `npm install tsx`
- Check Node.js version: `node --version` (should be 20+)

## Development

### Type Checking

```bash
npm run type-check
```

### Running Manually

You can test the server manually by setting environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_ACCESS_TOKEN="your-jwt-token"
npm start
```

The server will start and communicate via stdin/stdout (stdio transport). You can send MCP protocol messages manually for testing, but it's easier to use an MCP client like Claude Desktop.

## How It Works

1. **Authentication**: The server reads your JWT from the `SUPABASE_ACCESS_TOKEN` env var and creates a Supabase client with the token injected via `global.headers.Authorization`
2. **RLS Enforcement**: All Supabase queries are automatically scoped to your user ID via Row Level Security policies
3. **Semantic Search**: Calls the `rag-search` Edge Function which handles Gemini API key decryption, query embedding, and vector similarity search
4. **Full-Text Search**: Directly calls the `search_notes_fts` RPC function for keyword matching
5. **HTML Stripping**: Note content (HTML from TipTap editor) is converted to plain text for LLM-friendly output

## Limitations

- **Read-only**: No write operations (create, update, delete)
- **Token expiry**: JWT tokens expire after ~1 hour. Refresh by logging in again.
- **Semantic search**: Only works on indexed notes. Use FTS for all notes.
- **Rate limits**: Gemini free tier has a 5 RPM limit. Don't make rapid semantic search calls.

## Support

For issues or questions:
- Check the [main EverFreeNote README](../README.md)
- Review the [task spec](../docs/mcp-server-spec.md) (if available)
- Open an issue in the project repository
