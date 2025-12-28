import { NoteService } from '@core/services/notes'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper type for Sinon stubs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

describe('core/services/NoteService', () => {
  let mockSupabase: SupabaseClient
  let service: NoteService
  let mockQueryBuilder: {
    select: SinonStub,
    order: SinonStub,
    range: SinonStub,
    contains: SinonStub,
    or: SinonStub,
    insert: SinonStub,
    update: SinonStub,
    delete: SinonStub,
    eq: SinonStub,
    single: SinonStub,
    then: (resolve: (res: unknown) => void) => void
  }

  beforeEach(() => {
    mockQueryBuilder = {
      select: cy.stub().returnsThis(),
      order: cy.stub().returnsThis(),
      range: cy.stub().returnsThis(),
      contains: cy.stub().returnsThis(),
      or: cy.stub().returnsThis(),
      insert: cy.stub().returnsThis(),
      update: cy.stub().returnsThis(),
      delete: cy.stub().returnsThis(),
      eq: cy.stub().returnsThis(),
      single: cy.stub().resolves({ data: { id: '1' }, error: null }),
      then: (resolve: (res: unknown) => void) => resolve({ data: [], error: null, count: 0 })
    }

    mockSupabase = {
      from: cy.stub().returns(mockQueryBuilder)
    } as unknown as SupabaseClient

    service = new NoteService(mockSupabase)
  })

  describe('getNotes', () => {
    it('fetches notes with default options', async () => {
      const mockData = [{ id: '1', title: 'Note 1' }]
      mockQueryBuilder.then = (resolve: (res: unknown) => void) => resolve({ data: mockData, error: null, count: 1 })

      const result = await service.getNotes('user-1')

      expect(mockSupabase.from).to.have.been.calledWith('notes')
      expect(mockQueryBuilder.select).to.have.been.calledWith(
        'id, title, description, tags, created_at, updated_at, user_id',
        { count: 'exact' }
      )
      expect(mockQueryBuilder.range).to.have.been.calledWith(0, 49)
      expect(result.notes).to.deep.equal(mockData)
      expect(result.totalCount).to.equal(1)
    })

    it('applies pagination', async () => {
      await service.getNotes('user-1', { page: 1, pageSize: 10 })
      expect(mockQueryBuilder.range).to.have.been.calledWith(10, 19)
    })

    it('applies tag filter', async () => {
      await service.getNotes('user-1', { tag: 'test-tag' })
      expect(mockQueryBuilder.contains).to.have.been.calledWith('tags', ['test-tag'])
    })

    it('applies search query', async () => {
      await service.getNotes('user-1', { searchQuery: 'test' })
      expect(mockQueryBuilder.or).to.have.been.calledWith(
        Cypress.sinon.match((val: string) => val.includes('test'))
      )
    })

    it('sanitizes search query', async () => {
      await service.getNotes('user-1', { searchQuery: 'test,query' })
      expect(mockQueryBuilder.or).to.have.been.calledWith(
        Cypress.sinon.match((val: string) => val.includes('test query'))
      )
    })

    it('handles error', async () => {
      mockQueryBuilder.then = (resolve: (res: unknown) => void) => resolve({ data: null, error: { message: 'DB Error' } })

      try {
        await service.getNotes('user-1')
        expect.fail('Should have thrown')
      } catch (e: unknown) {
        expect((e as Error).message).to.equal('DB Error')
      }
    })

    it('calculates hasMore correctly', async () => {
      const mockData = Array(10).fill({ id: '1' })
      mockQueryBuilder.then = (resolve: (res: unknown) => void) => resolve({ data: mockData, error: null, count: 20 })

      const result = await service.getNotes('user-1', { pageSize: 10 })
      expect(result.hasMore).to.be.true
      expect(result.nextCursor).to.equal(1)
    })
  })

  describe('createNote', () => {
    it('creates a note', async () => {
      const newNote = { title: 'New', description: 'Desc', tags: [], userId: 'user-1' }
      await service.createNote(newNote)

      expect(mockQueryBuilder.insert).to.have.been.calledWith([
        {
          title: newNote.title,
          description: newNote.description,
          tags: newNote.tags,
          user_id: newNote.userId
        }
      ])
    })

    it('handles create error', async () => {
      mockQueryBuilder.single.resolves({ data: null, error: { message: 'Create Error' } })
      
      try {
        await service.createNote({ title: 'New', description: '', tags: [], userId: '1' })
        expect.fail('Should have thrown')
      } catch (e: unknown) {
        expect((e as Error).message).to.equal('Create Error')
      }
    })
  })

  describe('updateNote', () => {
    it('updates a note', async () => {
      await service.updateNote('1', { title: 'Updated' })

      expect(mockQueryBuilder.update).to.have.been.calledWith(
        Cypress.sinon.match({ title: 'Updated' })
      )
      expect(mockQueryBuilder.eq).to.have.been.calledWith('id', '1')
    })

    it('handles update error', async () => {
      mockQueryBuilder.single.resolves({ data: null, error: { message: 'Update Error' } })
      
      try {
        await service.updateNote('1', { title: 'Updated' })
        expect.fail('Should have thrown')
      } catch (e: unknown) {
        expect((e as Error).message).to.equal('Update Error')
      }
    })
  })

  describe('deleteNote', () => {
    it('deletes a note', async () => {
      mockQueryBuilder.then = (resolve: (res: unknown) => void) => resolve({ error: null })
      
      await service.deleteNote('1')
      expect(mockQueryBuilder.delete).to.have.been.called
      expect(mockQueryBuilder.eq).to.have.been.calledWith('id', '1')
    })

    it('handles delete error', async () => {
      mockQueryBuilder.then = (resolve: (res: unknown) => void) => resolve({ error: { message: 'Delete Error' } })
      
      try {
        await service.deleteNote('1')
        expect.fail('Should have thrown')
      } catch (e: unknown) {
        expect((e as Error).message).to.equal('Delete Error')
      }
    })
  })
})
