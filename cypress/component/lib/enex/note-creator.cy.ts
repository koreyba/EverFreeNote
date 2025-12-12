import { NoteCreator } from '@core/enex/note-creator'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedNote } from '@core/enex/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

type SupabaseQueryBuilder = {
  select: SinonStub
  eq: SinonStub
  insert: SinonStub
  update: SinonStub
  single: SinonStub
  then: (callback: (result: { data: unknown[]; error: unknown }) => void) => void
}

type SupabaseClientStub = {
  from: SinonStub
}

describe('NoteCreator', () => {
  let creator: NoteCreator
  let mockSupabase: SupabaseClientStub
  let mockQueryBuilder: SupabaseQueryBuilder

  const mockNote: ParsedNote = {
    title: 'Test Note',
    content: '<div>Content</div>',
    created: new Date('2023-01-01'),
    updated: new Date('2023-01-02'),
    tags: ['tag1'],
    resources: []
  }

  beforeEach(() => {
    mockQueryBuilder = {
      select: cy.stub().returnsThis(),
      eq: cy.stub().returnsThis(),
      insert: cy.stub().returnsThis(),
      update: cy.stub().returnsThis(),
      single: cy.stub().resolves({ data: { id: 'new-note-id' }, error: null }),
      then: (resolve) => resolve({ data: [], error: null }) // Default: no duplicates
    }

    mockSupabase = {
      from: cy.stub().returns(mockQueryBuilder)
    }

    creator = new NoteCreator(mockSupabase as unknown as SupabaseClient)
  })

  it('creates a new note when no duplicate exists', async () => {
    const id = await creator.create(mockNote, 'user1')
    
    expect(id).to.equal('new-note-id')
    expect(mockSupabase.from).to.have.been.calledWith('notes')
    expect(mockQueryBuilder.insert).to.have.been.called
    
    const insertCall = mockQueryBuilder.insert.getCall(0)
    const noteData = insertCall.args[0]
    expect(noteData.title).to.equal('Test Note')
    expect(noteData.user_id).to.equal('user1')
  })

  it('skips duplicate when strategy is skip', async () => {
    // Mock duplicate found
    mockQueryBuilder.then = (resolve) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
    const id = await creator.create(mockNote, 'user1', 'skip')
    
    expect(id).to.be.null
    expect(mockQueryBuilder.insert).not.to.have.been.called
    expect(mockQueryBuilder.update).not.to.have.been.called
  })

  it('replaces duplicate when strategy is replace', async () => {
    // Mock duplicate found
    mockQueryBuilder.then = (resolve) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
    // Mock update response
    mockQueryBuilder.single.resolves({ data: { id: 'existing-id' }, error: null })

    const id = await creator.create(mockNote, 'user1', 'replace')
    
    expect(id).to.equal('existing-id')
    expect(mockQueryBuilder.update).to.have.been.called
    expect(mockQueryBuilder.eq).to.have.been.calledWith('id', 'existing-id')
  })

  it('prefixes duplicate when strategy is prefix', async () => {
    // Mock duplicate found
    mockQueryBuilder.then = (resolve) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
    const id = await creator.create(mockNote, 'user1', 'prefix')
    
    expect(id).to.equal('new-note-id')
    expect(mockQueryBuilder.insert).to.have.been.called
    
    const insertCall = mockQueryBuilder.insert.getCall(0)
    const noteData = insertCall.args[0]
    expect(noteData.title).to.equal('[duplicate] Test Note')
  })

  it('handles creation error', async () => {
    mockQueryBuilder.single.resolves({ data: null, error: { message: 'DB Error' } })
    
    try {
      await creator.create(mockNote, 'user1')
      expect.fail('Should have thrown error')
    } catch (error: unknown) {
      expect((error as Error).message).to.contain('Failed to create note: DB Error')
    }
  })

  it('skips duplicates inside the same import when flag enabled', async () => {
    const context = {
      skipFileDuplicates: true,
      existingByTitle: new Map<string, string>(),
      seenTitlesInImport: new Set<string>(['Test Note'])
    }

    const id = await creator.create(mockNote, 'user1', 'skip', context)

    expect(id).to.be.null
    expect(mockSupabase.from).not.to.have.been.called
  })

  it('creates first occurrence and skips subsequent duplicates inside the same import', async () => {
    const context = {
      skipFileDuplicates: true,
      existingByTitle: new Map<string, string>(),
      seenTitlesInImport: new Set<string>()
    }

    const firstId = await creator.create(mockNote, 'user1', 'skip', context)
    const secondId = await creator.create(mockNote, 'user1', 'skip', context)

    expect(firstId).to.equal('new-note-id')
    expect(secondId).to.be.null
    expect(mockQueryBuilder.insert).to.have.been.calledOnce
  })
})
