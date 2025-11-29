import { NoteCreator } from '../../../../lib/enex/note-creator'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedNote } from '../../../../lib/enex/types'

describe('NoteCreator', () => {
  let creator: NoteCreator
  let mockSupabase: any
  let mockQueryBuilder: any

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
      then: (resolve: any) => resolve({ data: [], error: null }) // Default: no duplicates
    }

    mockSupabase = {
      from: cy.stub().returns(mockQueryBuilder)
    }

    creator = new NoteCreator(mockSupabase as SupabaseClient)
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
    mockQueryBuilder.then = (resolve: any) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
    const id = await creator.create(mockNote, 'user1', 'skip')
    
    expect(id).to.be.null
    expect(mockQueryBuilder.insert).not.to.have.been.called
    expect(mockQueryBuilder.update).not.to.have.been.called
  })

  it('replaces duplicate when strategy is replace', async () => {
    // Mock duplicate found
    mockQueryBuilder.then = (resolve: any) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
    // Mock update response
    mockQueryBuilder.single.resolves({ data: { id: 'existing-id' }, error: null })

    const id = await creator.create(mockNote, 'user1', 'replace')
    
    expect(id).to.equal('existing-id')
    expect(mockQueryBuilder.update).to.have.been.called
    expect(mockQueryBuilder.eq).to.have.been.calledWith('id', 'existing-id')
  })

  it('prefixes duplicate when strategy is prefix', async () => {
    // Mock duplicate found
    mockQueryBuilder.then = (resolve: any) => resolve({ data: [{ id: 'existing-id', title: 'Test Note' }], error: null })
    
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
    } catch (error: any) {
      expect(error.message).to.contain('Failed to create note: DB Error')
    }
  })
})
