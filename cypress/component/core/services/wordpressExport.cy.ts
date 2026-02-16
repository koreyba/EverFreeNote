import type { SupabaseClient } from '@supabase/supabase-js'
import {
  WordPressBridgeError,
  WordPressExportService,
} from '../../../../core/services/wordpressExport'

describe('core/services/WordPressExportService', () => {
  it('getCategories requests wordpress bridge categories action', async () => {
    const invoke = cy.stub().resolves({
      data: {
        categories: [{ id: 1, name: 'News' }],
        rememberedCategoryIds: [1],
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)
    const result = await service.getCategories()

    expect(result.categories).to.have.length(1)
    expect(result.rememberedCategoryIds).to.deep.equal([1])
    expect(invoke).to.have.been.calledWith('wordpress-bridge', {
      body: { action: 'get_categories' },
    })
  })

  it('getCategories throws normalized bridge error from context payload', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: {
          json: async () => ({
            code: 'wp_auth_failed',
            message: 'WordPress auth failed',
            details: { status: 401 },
          }),
        },
      },
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.getCategories()
      expect.fail('Expected getCategories to throw')
    } catch (error) {
      expect(error).to.be.instanceOf(WordPressBridgeError)
      expect((error as WordPressBridgeError).code).to.equal('wp_auth_failed')
      expect((error as WordPressBridgeError).message).to.equal('WordPress auth failed')
      expect((error as WordPressBridgeError).details).to.deep.equal({ status: 401 })
    }
  })

  it('getCategories throws invalid_response for malformed category payload', async () => {
    const invoke = cy.stub().resolves({
      data: {
        categories: { id: 1, name: 'News' },
        rememberedCategoryIds: [1],
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.getCategories()
      expect.fail('Expected getCategories to throw')
    } catch (error) {
      expect((error as WordPressBridgeError).code).to.equal('invalid_response')
      expect((error as WordPressBridgeError).message).to.equal('Invalid categories response')
    }
  })

  it('getCategories uses msg field when message is absent', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: {
        context: {
          json: async () => ({
            code: 'slug_conflict',
            msg: 'Slug already exists',
          }),
        },
      },
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.getCategories()
      expect.fail('Expected getCategories to throw')
    } catch (error) {
      expect((error as WordPressBridgeError).code).to.equal('slug_conflict')
      expect((error as WordPressBridgeError).message).to.equal('Slug already exists')
    }
  })

  it('exportNote defaults post status to publish', async () => {
    const invoke = cy.stub().resolves({
      data: {
        postId: 99,
        postUrl: 'https://example.com/post/99',
        slug: 'my-post',
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)
    const result = await service.exportNote({
      noteId: 'note-1',
      categoryIds: [1, 2],
      tags: ['one', 'two'],
      slug: 'my-post',
    })

    expect(result.postId).to.equal(99)
    expect(invoke).to.have.been.calledWith('wordpress-bridge', {
      body: {
        action: 'export_note',
        noteId: 'note-1',
        categoryIds: [1, 2],
        tags: ['one', 'two'],
        slug: 'my-post',
        title: undefined,
        status: 'publish',
      },
    })
  })

  it('exportNote forwards optional export-only title override', async () => {
    const invoke = cy.stub().resolves({
      data: {
        postId: 100,
        postUrl: 'https://example.com/post/100',
        slug: 'my-post',
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)
    await service.exportNote({
      noteId: 'note-1',
      categoryIds: [1],
      tags: ['one'],
      slug: 'my-post',
      title: 'Export title only',
    })

    expect(invoke).to.have.been.calledWith('wordpress-bridge', {
      body: {
        action: 'export_note',
        noteId: 'note-1',
        categoryIds: [1],
        tags: ['one'],
        slug: 'my-post',
        title: 'Export title only',
        status: 'publish',
      },
    })
  })

  it('exportNote throws invalid_response when success payload is malformed', async () => {
    const invoke = cy.stub().resolves({ data: null, error: null })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.exportNote({
        noteId: 'note-1',
        categoryIds: [],
        tags: [],
        slug: 'my-post',
      })
      expect.fail('Expected exportNote to throw')
    } catch (error) {
      expect((error as WordPressBridgeError).code).to.equal('invalid_response')
      expect((error as WordPressBridgeError).message).to.equal('Invalid export response')
    }
  })

  it('exportNote throws invalid_response when required fields have invalid types', async () => {
    const invoke = cy.stub().resolves({
      data: {
        postId: 'abc',
        postUrl: 123,
        slug: null,
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.exportNote({
        noteId: 'note-1',
        categoryIds: [],
        tags: [],
        slug: 'my-post',
      })
      expect.fail('Expected exportNote to throw')
    } catch (error) {
      expect((error as WordPressBridgeError).code).to.equal('invalid_response')
      expect((error as WordPressBridgeError).message).to.equal('Invalid export response')
    }
  })

  it('exportNote accepts numeric string postId and normalizes to number', async () => {
    const invoke = cy.stub().resolves({
      data: {
        postId: '42',
        postUrl: 'https://example.com/post/42',
        slug: 'my-post',
      },
      error: null,
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)
    const result = await service.exportNote({
      noteId: 'note-1',
      categoryIds: [],
      tags: [],
      slug: 'my-post',
    })

    expect(result.postId).to.equal(42)
  })

  it('exportNote falls back to bridge_error for plain Error invoke failures', async () => {
    const invoke = cy.stub().resolves({
      data: null,
      error: new Error('Network timeout'),
    })
    const supabase = {
      functions: { invoke },
    } as unknown as SupabaseClient

    const service = new WordPressExportService(supabase)

    try {
      await service.exportNote({
        noteId: 'note-1',
        categoryIds: [1],
        tags: ['tag'],
        slug: 'slug',
      })
      expect.fail('Expected exportNote to throw')
    } catch (error) {
      expect((error as WordPressBridgeError).code).to.equal('bridge_error')
      expect((error as WordPressBridgeError).message).to.equal('Network timeout')
    }
  })
})
