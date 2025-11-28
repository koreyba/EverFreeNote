// @ts-check
import React from 'react'
import { SearchResults } from '@/components/SearchResults'

describe('SearchResults Component', () => {
  let mockOnNoteClick

  beforeEach(() => {
    mockOnNoteClick = cy.stub().as('onNoteClick')
  })

  it('shows loading skeleton when isLoading is true', () => {
    const searchResult = {
      data: null,
      isLoading: true,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show skeleton elements (Skeleton component renders divs with animation)
    cy.get('[class*="animate-pulse"]').should('have.length.at.least', 1)
  })

  it('shows empty state when no results found', () => {
    const searchResult = {
      data: {
        results: [],
        total: 0,
        query: 'test query',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    cy.contains('Ничего не найдено').should('be.visible')
    cy.contains('test query').should('be.visible')
    cy.contains('Попробуйте изменить поисковый запрос').should('be.visible')
  })

  it('shows error state when isError is true', () => {
    const searchResult = {
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Database connection failed')
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    cy.contains('Ошибка поиска').should('be.visible')
    cy.contains('Database connection failed').should('be.visible')
  })

  it('displays search results with metadata', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Test Note 1',
            headline: 'This is a <mark>test</mark> note',
            tags: ['tag1', 'tag2'],
            updated_at: new Date().toISOString(),
            rank: 0.95
          },
          {
            id: '2',
            title: 'Test Note 2',
            headline: 'Another <mark>test</mark> result',
            tags: ['tag3'],
            updated_at: new Date().toISOString(),
            rank: 0.85
          }
        ],
        total: 2,
        query: 'test',
        method: 'fts',
        executionTime: 15
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show total count
    cy.contains('Найдено: 2 заметок').should('be.visible')
    
    // Should show execution time
    cy.contains('15ms').should('be.visible')
    
    // Should show FTS badge
    cy.contains('Быстрый поиск').should('be.visible')
    
    // Should show both notes
    cy.contains('Test Note 1').should('be.visible')
    cy.contains('Test Note 2').should('be.visible')
  })

  it('highlights search terms in results', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Test Note',
            headline: 'This is a <mark>highlighted</mark> term',
            tags: [],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'highlighted',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should have mark tag for highlighted text
    cy.get('mark').should('exist').and('contain', 'highlighted')
  })

  it('calls onNoteClick when a result is clicked', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Clickable Note',
            headline: 'Test content',
            tags: [],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    cy.contains('Clickable Note').click()
    
    cy.get('@onNoteClick').should('have.been.calledOnce')
  })

  it('displays tags for notes', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Note with Tags',
            headline: 'Test content',
            tags: ['javascript', 'react', 'testing', 'cypress', 'component', 'extra'],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show first 5 tags
    cy.contains('javascript').should('be.visible')
    cy.contains('react').should('be.visible')
    cy.contains('testing').should('be.visible')
    cy.contains('cypress').should('be.visible')
    cy.contains('component').should('be.visible')
    
    // Should show "+1" badge for remaining tags
    cy.contains('+1').should('be.visible')
  })

  it('shows rank when showRank is true', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Ranked Note',
            headline: 'Test content',
            tags: [],
            updated_at: new Date().toISOString(),
            rank: 0.87
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} showRank={true} />)
    
    // Should show rank as percentage (87%)
    cy.contains('87%').should('be.visible')
  })

  it('does not show rank when showRank is false', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Ranked Note',
            headline: 'Test content',
            tags: [],
            updated_at: new Date().toISOString(),
            rank: 0.87
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} showRank={false} />)
    
    // Should not show rank percentage
    cy.contains('87%').should('not.exist')
  })

  it('shows FTS badge for full-text search results', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'FTS Note',
            headline: 'Test content',
            tags: [],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show FTS badge on result card
    cy.contains('FTS').should('be.visible')
  })

  it('formats relative time correctly', () => {
    const now = new Date()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'Recent Note',
            headline: 'Test content',
            tags: [],
            updated_at: oneHourAgo.toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show relative time (1ч назад)
    cy.contains('1ч назад').should('be.visible')
  })

  it('handles notes without title', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: null,
            headline: 'Test content',
            tags: [],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show default title
    cy.contains('Без названия').should('be.visible')
  })

  it('sanitizes HTML in headlines', () => {
    const searchResult = {
      data: {
        results: [
          {
            id: '1',
            title: 'XSS Test',
            headline: '<mark>safe</mark><script>alert("xss")</script>',
            tags: [],
            updated_at: new Date().toISOString()
          }
        ],
        total: 1,
        query: 'test',
        method: 'fts'
      },
      isLoading: false,
      isError: false,
      error: null
    }

    cy.mount(<SearchResults searchResult={searchResult} onNoteClick={mockOnNoteClick} />)
    
    // Should show mark tag
    cy.get('mark').should('exist').and('contain', 'safe')
    
    // Should not have script tag in the result content
    // Note: Cypress itself may have script tags in the page, so we check within the result card
    cy.contains('XSS Test').parent().parent().parent().within(() => {
      cy.get('script').should('not.exist')
    })
  })
})

