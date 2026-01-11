import React from 'react'
import { NoteEditor } from '@ui/web/components/features/notes/NoteEditor'

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

    // Wait a bit less
    // cy.wait(300)
    cy.get('@onAutoSave').should('not.have.been.called', { timeout: 500 })

    // Wait enough
    //cy.wait(1000)
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
})
