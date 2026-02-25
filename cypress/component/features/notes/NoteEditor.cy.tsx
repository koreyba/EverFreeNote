import React from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NoteEditor } from '../../../../ui/web/components/features/notes/NoteEditor'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const createSupabaseForExportDialog = () => {
  const invoke = cy.stub().callsFake((name: string, params: { body: { action?: string } }) => {
    if (name === 'wordpress-settings-status') {
      return Promise.resolve({
        data: {
          configured: true,
          integration: {
            siteUrl: 'https://stage.dkoreiba.com/',
            wpUsername: 'editor',
            enabled: true,
            hasPassword: true,
          },
        },
        error: null,
      })
    }
    if (name === 'wordpress-bridge' && params.body.action === 'get_categories') {
      return Promise.resolve({
        data: {
          categories: [{ id: 1, name: 'Tech' }],
          rememberedCategoryIds: [],
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })

  const supabase = {
    functions: { invoke },
    auth: {
      getUser: cy.stub().resolves({ data: { user: { id: 'user-1' } } }),
    },
    from: cy.stub().returns({
      upsert: cy.stub().resolves({ error: null }),
      update: cy.stub().returnsThis(),
      eq: cy.stub().resolves({ error: null }),
    }),
  } as unknown as SupabaseClient

  return { supabase, invoke }
}

describe('NoteEditor Component', () => {
  const getDefaultProps = () => ({
    initialTitle: 'Test Title',
    initialDescription: '<p>Test Description</p>',
    initialTags: 'tag1, tag2',
    availableTags: ['tag1', 'tag2', 'work', 'world', 'personal'],
    isSaving: false,
    onSave: (() => {
      const stub = cy.stub()
      cy.wrap(stub).as('onSave')
      return stub
    })(),
    onRead: (() => {
      const stub = cy.stub()
      cy.wrap(stub).as('onRead')
      return stub
    })(),
  })

  it('renders in edit mode', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.contains('Editing').should('be.visible')
    cy.get('input[placeholder="Note title"]').should('have.value', 'Test Title')
    cy.get('button[title="Add tag"]').should('be.visible')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 2)
    cy.get('.ProseMirror').should('contain.text', 'Test Description')
  })

  it('handles input changes and save', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('input[placeholder="Note title"]').clear().type('New Title')
    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('New Tag{enter}')

    cy.contains('Save').click()

    cy.get('@onSave').should('have.been.calledWith', Cypress.sinon.match({
      title: 'New Title',
      tags: 'tag1, tag2, new tag'
    }))
  })

  it('handles save and read actions', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.contains('Save').click()
    cy.get('@onSave').should('have.been.called')

    cy.contains('Read').click()
    cy.get('@onRead').should('have.been.called')
  })

  it('shows saving state', () => {
    const props = { ...getDefaultProps(), isSaving: true }
    cy.mount(<NoteEditor {...props} />)

    // "Saving..." text is now in a separate div, not in the button
    cy.contains('Saving...').should('be.visible')
    // Button should be disabled during manual save, but text remains "Save"
    cy.get('button').contains('Save').should('be.disabled')
  })

  it('shows auto-saving state without disabling button', () => {
    const props = { ...getDefaultProps(), isAutoSaving: true }
    cy.mount(<NoteEditor {...props} />)

    cy.contains('Saving...').should('be.visible')
    // Button should NOT be disabled during auto-save
    cy.get('button').contains('Save').should('not.be.disabled')
  })

  it('shows last saved timestamp', () => {
    const lastSavedAt = new Date('2023-01-01T12:00:00').toISOString()
    const props = { ...getDefaultProps(), lastSavedAt }
    cy.mount(<NoteEditor {...props} />)

    cy.contains(`Saved at ${new Date(lastSavedAt).toLocaleTimeString()}`).should('be.visible')
  })

  it('debounces autosave', () => {
    // Using real timers to avoid issues with cy.clock and React state updates
    const onAutoSave = (() => {
      const stub = cy.stub().resolves()
      cy.wrap(stub).as('onAutoSave')
      return stub
    })()
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      onAutoSave,
      autosaveDelayMs: 200, // short delay
    }

    cy.mount(<NoteEditor {...props} />)

    cy.get('input[placeholder="Note title"]').clear().type('New Title')

    // INPUT_DEBOUNCE_MS (250) + autosaveDelayMs (200) = 450ms

    cy.get('@onAutoSave').should('not.have.been.called', { timeout: 500 })

    cy.get('@onAutoSave').should('have.been.calledOnce', { timeout: 1500 })
    cy.get('@onAutoSave').should('have.been.calledWith', Cypress.sinon.match({
      noteId: 'note-1',
      title: 'New Title',
    }))
  })

  it('shows suggestions after 3 characters and applies selection', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('wo')
    cy.contains('button', 'work').should('not.exist')

    cy.get('input[placeholder="work, personal, ideas"]').type('r')
    cy.contains('button', 'work').should('be.visible')
    cy.contains('button', 'world').should('be.visible')

    cy.contains('button', 'work').click()
    cy.get('[data-cy="interactive-tag"]').should('have.length', 3)
  })

  it('excludes already selected tags from suggestions', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('tag')
    cy.contains('button', 'tag1').should('not.exist')
    cy.contains('button', 'tag2').should('not.exist')
  })

  it('adds tags via comma/enter and removes with backspace on second press', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('New  Tag,')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 3)
    cy.contains('[data-cy="interactive-tag"]', 'new tag').should('be.visible')

    cy.get('input[placeholder="work, personal, ideas"]').type('next{enter}')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 4)

    cy.get('input[placeholder="work, personal, ideas"]').type('{backspace}')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 4)
    cy.get('input[placeholder="work, personal, ideas"]').type('{backspace}')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 3)
  })

  it('commits a pending tag on blur but not on space alone', () => {
    cy.mount(<NoteEditor {...getDefaultProps()} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('space ')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 2)

    cy.get('input[placeholder="Note title"]').click()
    cy.get('[data-cy="interactive-tag"]').should('have.length', 3)
    cy.contains('[data-cy="interactive-tag"]', 'space').should('be.visible')
  })

  it('commits pending tag on autosave', () => {
    const onAutoSave = (() => {
      const stub = cy.stub().resolves()
      cy.wrap(stub).as('onAutoSave')
      return stub
    })()
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      onAutoSave,
      autosaveDelayMs: 200,
    }

    cy.mount(<NoteEditor {...props} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('Pending Tag')
    cy.get('input[placeholder="Note title"]').type(' updated')

    cy.get('@onAutoSave').should('have.been.calledOnce', { timeout: 1500 })
    cy.get('@onAutoSave').should('have.been.calledWith', Cypress.sinon.match({
      noteId: 'note-1',
      tags: 'tag1, tag2, pending tag'
    }))
  })

  it('does not autosave when only tags change', () => {
    const onAutoSave = (() => {
      const stub = cy.stub().resolves()
      cy.wrap(stub).as('onAutoSave')
      return stub
    })()
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      onAutoSave,
      autosaveDelayMs: 200,
    }

    cy.mount(<NoteEditor {...props} />)

    cy.get('button[title="Add tag"]').click()
    cy.get('input[placeholder="work, personal, ideas"]').type('onlytag{enter}')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 3)

    cy.get('@onAutoSave').should('not.have.been.called', { timeout: 800 })
  })

  it('does not interrupt typing when autosave updates props / assigns noteId', () => {
    const onAutoSave = cy.stub().callsFake(async () => undefined)

    function Wrapper() {
      const [state, setState] = React.useState({
        noteId: undefined as string | undefined,
        title: 'Draft',
        description: '<p></p>',
        tags: '',
      })

      const handleAutoSave = async (payload: { noteId?: string; title: string; description: string; tags: string }) => {
        onAutoSave(payload)

        // Simulate the controller: first autosave creates the note and assigns an id,
        // subsequent autosaves keep updating the selected note fields.
        setState((prev) => ({
          noteId: prev.noteId ?? 'note-1',
          title: payload.title,
          description: payload.description,
          tags: payload.tags,
        }))
      }

      return (
        <div>
          <div data-cy="note-id">{state.noteId ?? 'none'}</div>
          <NoteEditor
            noteId={state.noteId}
            initialTitle={state.title}
            initialDescription={state.description}
            initialTags={state.tags}
            availableTags={[]}
            isSaving={false}
            onSave={() => undefined}
            onRead={() => undefined}
            onAutoSave={handleAutoSave}
            autosaveDelayMs={50}
          />
        </div>
      )
    }

    cy.mount(<Wrapper />)

    cy.get('[data-cy="editor-content"]').click().type('Hello')

    // Wait for first autosave to assign an id
    cy.get('[data-cy="note-id"]').should('have.text', 'note-1')

    // If autosave caused a remount/blur, focus would be lost and typing would require another click.
    cy.focused().should('have.class', 'ProseMirror')
    cy.focused().type('World')

    cy.get('[data-cy="editor-content"]').should('contain.text', 'HelloWorld')
    cy.wrap(onAutoSave).should('have.been.called')
  })

  it('resets editor undo/redo history when switching between different notes', () => {
    function Wrapper() {
      const [active, setActive] = React.useState<'a' | 'b'>('a')
      const note = active === 'a'
        ? {
            id: 'note-a',
            title: 'Note A',
            description: '<p>Alpha body</p>',
            tags: 'alpha',
          }
        : {
            id: 'note-b',
            title: 'Note B',
            description: '<p>Beta body</p>',
            tags: 'beta',
          }

      return (
        <div>
          <button type="button" data-cy="switch-note" onClick={() => setActive((prev) => (prev === 'a' ? 'b' : 'a'))}>
            Switch note
          </button>
          <NoteEditor
            noteId={note.id}
            initialTitle={note.title}
            initialDescription={note.description}
            initialTags={note.tags}
            availableTags={[]}
            isSaving={false}
            onSave={() => undefined}
            onRead={() => undefined}
          />
        </div>
      )
    }

    cy.mount(<Wrapper />)

    cy.get('[data-cy="editor-content"]').should('contain.text', 'Alpha body')
    cy.get('[data-cy="undo-button"]').should('be.disabled')
    cy.get('[data-cy="redo-button"]').should('be.disabled')

    // Create history in note A.
    cy.get('[data-cy="editor-content"]').click().type('{end} edited')
    cy.get('[data-cy="undo-button"]').should('not.be.disabled')

    // Switch to note B and verify new editor session starts with clean history.
    cy.get('[data-cy="switch-note"]').click()
    cy.get('input[placeholder="Note title"]').should('have.value', 'Note B')
    cy.get('[data-cy="editor-content"]').should('contain.text', 'Beta body')
    cy.get('[data-cy="editor-content"]').should('not.contain.text', 'edited')
    cy.get('[data-cy="undo-button"]').should('be.disabled')
    cy.get('[data-cy="redo-button"]').should('be.disabled')
  })

  it('shows export button when WordPress is configured and note has id', () => {
    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      wordpressConfigured: true,
    }

    cy.mount(<NoteEditor {...props} />)
    cy.contains('button', 'Export to WP').should('be.visible')
  })

  it('shows mobile more-actions menu instead of visible export button', () => {
    cy.viewport(390, 844)

    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      wordpressConfigured: true,
    }

    cy.mount(<NoteEditor {...props} />)
    cy.contains('button', 'Export to WP')
      .should('have.class', 'hidden')
      .and('have.class', 'md:inline-flex')
    cy.get('button[aria-label="More actions"]').should('be.visible')
  })

  it('opens export dialog from mobile menu and closes menu content', () => {
    cy.viewport(390, 844)

    const props = {
      ...getDefaultProps(),
      noteId: 'note-1',
      wordpressConfigured: true,
    }
    const { supabase, invoke } = createSupabaseForExportDialog()

    cy.mount(
      <SupabaseTestProvider supabase={supabase}>
        <NoteEditor {...props} />
      </SupabaseTestProvider>
    )

    cy.get('button[aria-label="More actions"]').click()
    cy.contains('[role="menuitem"]', 'Export to WP').click()

    cy.contains('[role="menuitem"]', 'Export to WP').should('not.exist')
    cy.contains('Export to WordPress').should('be.visible')
    cy.wrap(invoke).should('have.been.calledWith', 'wordpress-bridge', {
      body: { action: 'get_categories' },
    })
  })

  it('hides export button for new notes without id', () => {
    const props = {
      ...getDefaultProps(),
      wordpressConfigured: true,
    }

    cy.mount(<NoteEditor {...props} />)
    cy.contains('button', 'Export to WP').should('not.exist')
  })
})

/**
 * Race condition tests: new note creation with slow network.
 *
 * These tests simulate the real controller flow where createNoteMutation.mutateAsync()
 * takes time to complete. While the request is in-flight, the user continues typing.
 * The server responds with the STALE payload (captured at debounce-flush time),
 * which causes noteId to change from undefined → UUID and initialDescription/initialTitle
 * props to carry stale values. The NoteEditor sync effect must NOT reset the editor
 * to those stale values.
 *
 * The controllable-promise pattern lets us deterministically:
 *   1. Wait for the autosave to start  (cy.get inflight = true)
 *   2. Type while the request is in-flight
 *   3. Resolve the "network request"    (cy.then → resolve)
 *   4. Wait for the response to land    (cy.get noteId = server-uuid-1)
 *   5. Assert editor content is intact
 */
describe('NoteEditor – autosave race condition on new note create', () => {

  type AutoSavePayload = {
    noteId?: string
    title: string
    description: string
    tags: string
  }

  /**
   * Factory that builds a Wrapper simulating the controller's create-note flow
   * with a controllable "network delay" for the create mutation.
   */
  function createWrapper(initialState?: { title?: string; description?: string; tags?: string }) {
    let _resolveCreate: (() => void) | null = null

    function Wrapper() {
      const [state, setState] = React.useState({
        noteId: undefined as string | undefined,
        title: initialState?.title ?? '',
        description: initialState?.description ?? '',
        tags: initialState?.tags ?? '',
      })
      const [inflight, setInflight] = React.useState(false)
      const createCalledRef = React.useRef(false)

      const handleAutoSave = React.useCallback(
        async (payload: AutoSavePayload) => {
          // Only the first call triggers the delayed create; skip concurrent calls
          if (createCalledRef.current) return
          if (!state.noteId) {
            createCalledRef.current = true
            // Capture payload NOW — this is what the server receives
            const serverSnapshot = { ...payload }
            setInflight(true)

            // Pause until the test resolves the "network request"
            await new Promise<void>((r) => { _resolveCreate = r })

            // Simulate: server returns the note with a real ID,
            // but title/description/tags are from the SNAPSHOT (stale)
            setState({
              noteId: 'server-uuid-1',
              title: serverSnapshot.title,
              description: serverSnapshot.description,
              tags: serverSnapshot.tags,
            })
            setInflight(false)
          }
        },
        [state.noteId],
      )

      return (
        <div>
          <div data-cy="note-id">{state.noteId ?? 'none'}</div>
          <div data-cy="inflight">{String(inflight)}</div>
          <NoteEditor
            noteId={state.noteId}
            initialTitle={state.title}
            initialDescription={state.description}
            initialTags={state.tags}
            availableTags={[]}
            isSaving={false}
            onSave={() => undefined}
            onRead={() => undefined}
            onAutoSave={handleAutoSave}
            autosaveDelayMs={50}
          />
        </div>
      )
    }

    return { Wrapper, resolveCreate: () => _resolveCreate?.() }
  }

  it('preserves body text typed while create-autosave is in-flight', () => {
    const { Wrapper, resolveCreate } = createWrapper()
    cy.mount(<Wrapper />)

    // Type title → triggers debounced autosave that captures {title, description: ""}
    cy.get('input[placeholder="Note title"]').type('My Title')

    // Wait for autosave to fire and hit the "network"
    cy.get('[data-cy="inflight"]').should('have.text', 'true')

    // While the create request is in-flight, type body text
    cy.get('[data-cy="editor-content"]').click().type('Body during flight')

    // "Server responds" with stale snapshot (description: "")
    cy.then(() => resolveCreate())

    // Wait for the response to be processed
    cy.get('[data-cy="note-id"]').should('have.text', 'server-uuid-1')
    cy.get('[data-cy="inflight"]').should('have.text', 'false')

    // Body text typed during in-flight MUST be preserved
    cy.get('[data-cy="editor-content"]').should('contain.text', 'Body during flight')
    cy.get('input[placeholder="Note title"]').should('have.value', 'My Title')
  })

  it('preserves body continuation typed during in-flight create', () => {
    // Start with pre-existing body content
    const { Wrapper, resolveCreate } = createWrapper({
      description: '<p>Initial body </p>',
    })
    cy.mount(<Wrapper />)

    cy.get('[data-cy="editor-content"]').should('contain.text', 'Initial body')

    // Type title → autosave captures {title, description: "Initial body "}
    cy.get('input[placeholder="Note title"]').type('Title')
    cy.get('[data-cy="inflight"]').should('have.text', 'true')

    // While in-flight, append more body text
    cy.get('[data-cy="editor-content"]').click().type('Extra text')

    // Server responds with stale snapshot (only "Initial body ")
    cy.then(() => resolveCreate())
    cy.get('[data-cy="note-id"]').should('have.text', 'server-uuid-1')

    // Both original AND newly typed body text MUST be preserved
    cy.get('[data-cy="editor-content"]').should('contain.text', 'Initial body')
    cy.get('[data-cy="editor-content"]').should('contain.text', 'Extra text')
  })

  it('preserves title changes made during in-flight create', () => {
    const { Wrapper, resolveCreate } = createWrapper()
    cy.mount(<Wrapper />)

    // Type title → autosave captures {title: "Hello"}
    cy.get('input[placeholder="Note title"]').type('Hello')
    cy.get('[data-cy="inflight"]').should('have.text', 'true')

    // While in-flight, append to title
    cy.get('input[placeholder="Note title"]').type(' World')

    // Server responds with stale snapshot (title: "Hello")
    cy.then(() => resolveCreate())
    cy.get('[data-cy="note-id"]').should('have.text', 'server-uuid-1')

    // Full title "Hello World" MUST be preserved
    cy.get('input[placeholder="Note title"]').should('have.value', 'Hello World')
  })
})
