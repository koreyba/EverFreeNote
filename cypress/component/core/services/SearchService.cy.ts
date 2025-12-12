import { SearchService } from '@/core/services/search'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('core/services/SearchService', () => {
  let mockSupabase: SupabaseClient
  let service: SearchService
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockQueryBuilder: any

  beforeEach(() => {
    mockQueryBuilder = {
      select: cy.stub().returnsThis(),
      eq: cy.stub().returnsThis(),
      or: cy.stub().returnsThis(),
      contains: cy.stub().returnsThis(),
      range: cy.stub().returnsThis(),
      order: cy.stub().resolves({ data: [], error: null })
    }

    mockSupabase = {
      rpc: cy.stub().resolves({ data: [], error: null }),
      from: cy.stub().returns(mockQueryBuilder)
    } as unknown as SupabaseClient

    service = new SearchService(mockSupabase)
  })

  describe('searchNotes', () => {
    it('uses FTS when available', async () => {
      const mockData = [{ id: '1', title: 'Test', rank: 0.5 }]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ; (mockSupabase.rpc as any).resolves({ data: mockData, error: null })

      const result = await service.searchNotes('user-1', 'test query')

      expect(mockSupabase.rpc).to.have.been.calledWith('search_notes_fts', Cypress.sinon.match({
        search_query: 'test:* & query:*',
        search_language: 'english',
        search_user_id: 'user-1'
      }))

      expect(result.method).to.equal('fts')
      expect(result.results).to.deep.equal(mockData)
    })

    it('passes filter_tag to RPC for server-side filtering', async () => {
      const mockData = [
        { id: '1', title: 'Test 1', tags: ['tag1'] }
      ]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ; (mockSupabase.rpc as any).resolves({ data: mockData, error: null })

      const result = await service.searchNotes('user-1', 'test', { tag: 'tag1' })

      expect(mockSupabase.rpc).to.have.been.calledWith('search_notes_fts', Cypress.sinon.match({
        filter_tag: 'tag1'
      }))
      expect(result.results).to.have.length(1)
    })

    it('falls back to ILIKE when FTS fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (mockSupabase.rpc as any).resolves({ data: null, error: { message: 'FTS Error' } })

      const mockFallbackData = [{ id: '1', title: 'Fallback', description: 'Desc' }]
      mockQueryBuilder.order.resolves({ data: mockFallbackData, error: null })

      const result = await service.searchNotes('user-1', 'test')

      expect(result.method).to.equal('fallback')
      expect(mockSupabase.from).to.have.been.calledWith('notes')
      expect(mockQueryBuilder.or).to.have.been.called
    })

    it('sanitizes input for ILIKE', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (mockSupabase.rpc as any).resolves({ error: true })

      await service.searchNotes('user-1', 'test,query')

      // Should preserve comma (only quotes are removed)
      expect(mockQueryBuilder.or).to.have.been.calledWith(
        Cypress.sinon.match((val: string) => val.includes('test,query'))
      )
    })

    it('applies tag filter in fallback', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (mockSupabase.rpc as any).resolves({ error: true })

      await service.searchNotes('user-1', 'test', { tag: 'tag1' })

      expect(mockQueryBuilder.contains).to.have.been.calledWith('tags', ['tag1'])
    })

    it('handles fallback error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (mockSupabase.rpc as any).resolves({ error: true })
      mockQueryBuilder.order.resolves({ data: null, error: { message: 'DB Error' } })

      const result = await service.searchNotes('user-1', 'test')

      expect(result.error).to.equal('DB Error')
      expect(result.results).to.be.empty
    })
  })
})
