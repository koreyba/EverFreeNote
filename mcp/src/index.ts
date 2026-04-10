#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { getUserId } from './supabaseClient.js'
import { SEARCH_NOTES_TOOL, searchNotes } from './tools/searchNotes.js'
import { LIST_NOTES_TOOL, listNotes } from './tools/listNotes.js'
import { READ_NOTE_TOOL, readNote } from './tools/readNote.js'
import { FTS_SEARCH_TOOL, ftsSearch } from './tools/ftsSearch.js'

// Read version from package.json
const packageJson = await import('../package.json', { assert: { type: 'json' } })
const version = packageJson.default.version

const server = new Server(
  {
    name: 'everfreenote',
    version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

/**
 * Validate environment and authenticate user on startup.
 */
async function validateEnvironment(): Promise<void> {
  try {
    // This will throw if env vars are missing or token is invalid
    const userId = await getUserId()
    console.error('[MCP] ✓ Authentication successful')
    console.error(`[MCP] ✓ User ID: ${userId}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[MCP] ✗ Environment validation failed:')
    console.error(errorMsg)
    process.exit(1)
  }
}

/**
 * Register all available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [SEARCH_NOTES_TOOL, LIST_NOTES_TOOL, READ_NOTE_TOOL, FTS_SEARCH_TOOL],
  }
})

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result: string

    switch (name) {
      case 'search_notes':
        result = await searchNotes(args as Parameters<typeof searchNotes>[0])
        break

      case 'list_notes':
        result = await listNotes(args as Parameters<typeof listNotes>[0])
        break

      case 'read_note':
        result = await readNote(args as Parameters<typeof readNote>[0])
        break

      case 'search_notes_fts':
        result = await ftsSearch(args as Parameters<typeof ftsSearch>[0])
        break

      default:
        throw new Error(`Unknown tool: ${name}`)
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMsg}`,
        },
      ],
      isError: true,
    }
  }
})

/**
 * Start the server.
 */
async function main() {
  console.error('[MCP] EverFreeNote MCP Server starting...')

  // Validate environment and authenticate
  await validateEnvironment()

  console.error('[MCP] ✓ All checks passed')
  console.error('[MCP] Starting stdio transport...')

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('[MCP] ✓ Server running')
}

/**
 * Handle process signals for graceful shutdown.
 */
process.on('SIGINT', async () => {
  console.error('[MCP] Received SIGINT, shutting down...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.error('[MCP] Received SIGTERM, shutting down...')
  await server.close()
  process.exit(0)
})

// Start the server
main().catch((error) => {
  console.error('[MCP] Fatal error:', error)
  process.exit(1)
})
