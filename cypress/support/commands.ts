/// <reference types="cypress" />

import React from 'react'
import { mount } from 'cypress/react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { SupabaseTestProvider } from '../../ui/web/providers/SupabaseProvider'

type ImportStrategy = 'prefix' | 'skip'

type NoteInput = {
  title?: string
  content?: string
  tags?: string | string[]
}

type SupabaseMountOptions = Parameters<typeof mount>[1] & {
  supabase?: SupabaseClient
  supabaseUser?: User | null
  supabaseLoading?: boolean
  wrapWithSupabase?: boolean
}

const createThenableQueryBuilder = () => {
  const result = { data: [], error: null } as { data: unknown[]; error: null }
  const builder: Record<string, unknown> = {}

  const chain = () => builder
  builder.select = chain
  builder.insert = chain
  builder.update = chain
  builder.delete = chain
  builder.upsert = chain
  builder.eq = chain
  builder.neq = chain
  builder.gte = chain
  builder.gt = chain
  builder.lte = chain
  builder.lt = chain
  builder.ilike = chain
  builder.like = chain
  builder.in = chain
  builder.contains = chain
  builder.order = chain
  builder.limit = chain
  builder.range = chain
  builder.or = chain
  builder.match = chain
  builder.not = chain

  builder.single = () => Promise.resolve({ data: null, error: null })
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null })

  // Make chained builders awaitable to mimic Postgrest builders.
  builder.then = (onFulfilled?: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  builder.catch = (onRejected?: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected)
  builder.finally = (onFinally?: () => void) => Promise.resolve(result).finally(onFinally)

  return builder
}

const createDefaultSupabaseMock = (): SupabaseClient => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
  from: () => createThenableQueryBuilder(),
  rpc: () => Promise.resolve({ data: null, error: null }),
}) as unknown as SupabaseClient

const getSupabaseAnonKey = (): string | null => {
  const key =
    Cypress.env('SUPABASE_ANON_KEY') ||
    Cypress.env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    Cypress.env('EXPO_PUBLIC_SUPABASE_ANON_KEY')
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

// ============================================
// E2E Custom Commands
// ============================================

Cypress.Commands.add('login', () => {
  cy.visit('/', { timeout: 30000 })
  cy.contains('Skip Authentication', { timeout: 15000 }).should('be.visible').click()
  cy.contains('New Note', { timeout: 15000 }).should('be.visible')
})

Cypress.Commands.add('createNote', (title: string, content: string, tags = '') => {
  cy.contains('New Note').click()
  cy.get('input[placeholder="Note title"]').type(title)
  cy.get('[data-cy="editor-content"] .tiptap').click().type(content)

  if (tags) {
    cy.get('input[placeholder="work, personal, ideas"]').type(tags)
  }

  cy.contains('button', 'Save').click()
  cy.contains('Note created successfully', { timeout: 15000 }).should('be.visible')
})

Cypress.Commands.add('deleteNote', (title: string) => {
  cy.contains(title).click()
  cy.contains('button', 'Delete').should('be.visible').click()
  cy.contains('Note deleted successfully', { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('deleteAllNotes', () => {
  cy.log('deleteAllNotes: Not implemented yet')
})

Cypress.Commands.add('searchNotes', (query: string) => {
  if (query) {
    cy.get('input[placeholder*="Search"]').clear().type(query)
  } else {
    cy.get('input[placeholder*="Search"]').clear()
  }
})

Cypress.Commands.add('clearSearch', () => {
  cy.get('input[placeholder*="Search"]').clear()
})

Cypress.Commands.add('filterByTag', (tag: string) => {
  cy.contains(tag).click()
})

Cypress.Commands.add('toggleTheme', () => {
  cy.get('button').filter(':has(svg.lucide-sun, svg.lucide-moon)').click()
})

Cypress.Commands.add('importEnex', (filename: string, strategy: ImportStrategy = 'prefix') => {
  cy.contains('Import .enex file').click()
  cy.get('input[type="file"]').selectFile(`cypress/fixtures/enex/${filename}`, { force: true })

  if (strategy === 'prefix') {
    cy.get('#prefix').click()
  } else {
    cy.get('#skip').click()
  }

  cy.contains('button', 'Import').click()
  cy.contains('Import completed', { timeout: 30000 }).should('be.visible')
  cy.contains('button', 'Close').click()
})

// ============================================
// Assertion Commands
// ============================================

Cypress.Commands.add('assertNoteExists', (title: string) => {
  cy.contains(title).should('exist').scrollIntoView().should('be.visible')
})

Cypress.Commands.add('assertNoteNotExists', (title: string) => {
  cy.contains(title).should('not.exist')
})

Cypress.Commands.add('assertTagExists', (tag: string) => {
  cy.contains(tag).should('be.visible')
})

// ============================================
// API Commands (for faster test data creation)
// ============================================

Cypress.Commands.add('createNotesViaAPI', (notes: NoteInput[]) => {
  const supabaseAnonKey = getSupabaseAnonKey()
  if (!supabaseAnonKey) {
    cy.log('SUPABASE_ANON_KEY not set; skipping API note creation')
    return
  }

  cy.request({
    method: 'GET',
    url: 'http://localhost:54321/auth/v1/user',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    failOnStatusCode: false,
  }).then(() => {
    cy.window().then((win) => {
      const session = JSON.parse(win.localStorage.getItem('sb-localhost-auth-token') || '{}') as {
        access_token?: string
        user?: { id?: string }
      }
      const accessToken = session?.access_token
      const userId = session?.user?.id

      if (!userId || !accessToken) {
        cy.log('No user session found, skipping API note creation')
        return
      }

      const notesData = notes.map((note) => ({
        user_id: userId,
        title: note.title || 'Untitled',
        description: note.content || '',
        tags: Array.isArray(note.tags)
          ? note.tags
          : note.tags
            ? note.tags
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t)
            : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      cy.request({
        method: 'POST',
        url: 'http://localhost:54321/rest/v1/notes',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: notesData,
      })
    })
  })
})

Cypress.Commands.add('deleteAllNotesViaAPI', () => {
  const supabaseAnonKey = getSupabaseAnonKey()
  if (!supabaseAnonKey) {
    cy.log('SUPABASE_ANON_KEY not set; skipping API cleanup')
    return
  }

  cy.window().then((win) => {
    const session = JSON.parse(win.localStorage.getItem('sb-localhost-auth-token') || '{}') as {
      access_token?: string
      user?: { id?: string }
    }
    const accessToken = session?.access_token
    const userId = session?.user?.id

    if (!userId || !accessToken) {
      cy.log('No user session found, skipping cleanup')
      return
    }

    cy.request({
      method: 'DELETE',
      url: `http://localhost:54321/rest/v1/notes?user_id=eq.${userId}`,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    })
  })
})

// For component testing:
// wrap every mount with SupabaseTestProvider so feature components can use useSupabase().
Cypress.Commands.add('mount', (component, options: SupabaseMountOptions = {}) => {
  const {
    supabase,
    supabaseUser,
    supabaseLoading,
    wrapWithSupabase = true,
    ...mountOptions
  } = options

  if (!wrapWithSupabase) {
    return mount(component, mountOptions)
  }

  const wrapped = React.createElement(
    SupabaseTestProvider as React.ComponentType<{
      supabase: SupabaseClient
      user?: User | null
      loading?: boolean
      children?: React.ReactNode
    }>,
    {
      supabase: supabase ?? createDefaultSupabaseMock(),
      user: supabaseUser ?? { id: 'test-user' } as User,
      loading: supabaseLoading ?? false,
    },
    component,
  )

  return mount(wrapped, mountOptions)
})

// Custom command for rich text editor testing
Cypress.Commands.add('typeInRichEditor', (content: string) => {
  cy.get('.ql-editor').clear().type(content)
})

Cypress.Commands.add('applyRichTextFormatting', (buttonText: string) => {
  cy.contains('button', buttonText).click()
})

Cypress.Commands.add('selectTextInEditor', (startOffset: number, endOffset: number) => {
  cy.get('.ql-editor').then(($editor) => {
    const editor = $editor[0]
    const range = document.createRange()
    const textNode = editor.firstChild

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, startOffset)
      range.setEnd(textNode, endOffset)

      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
      createNote(title: string, content: string, tags?: string): Chainable<void>
      deleteNote(title: string): Chainable<void>
      deleteAllNotes(): Chainable<void>
      searchNotes(query: string): Chainable<void>
      clearSearch(): Chainable<void>
      filterByTag(tag: string): Chainable<void>
      toggleTheme(): Chainable<void>
      importEnex(filename: string, strategy?: ImportStrategy): Chainable<void>
      assertNoteExists(title: string): Chainable<void>
      assertNoteNotExists(title: string): Chainable<void>
      assertTagExists(tag: string): Chainable<void>
      createNotesViaAPI(notes: NoteInput[]): Chainable<void>
      deleteAllNotesViaAPI(): Chainable<void>
      mount: typeof mount
      typeInRichEditor(content: string): Chainable<void>
      applyRichTextFormatting(buttonText: string): Chainable<void>
      selectTextInEditor(startOffset: number, endOffset: number): Chainable<void>
    }
  }
}

export {}
