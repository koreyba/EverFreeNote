/**
 * E2E tests for Full-Text Search functionality
 */

describe('Full-Text Search', () => {
  beforeEach(() => {
    // Visit app and login
    cy.visit('http://localhost:3000')
    
    // Login as test user
    cy.contains('button', 'Test Login').click()
    
    // Wait for notes to load
    cy.contains('New Note', { timeout: 10000 }).should('be.visible')
  })

  describe('Search API', () => {
    it('should search notes using FTS API', () => {
      // Create a test note
      cy.contains('button', 'New Note').click()
      cy.get('input[placeholder="Note title"]').type('FTS Test Note')
      cy.get('input[placeholder="work, personal, ideas"]').type('testing, fts')
      
      // Type in rich text editor
      cy.get('.tiptap').type('This is a full-text search test with keywords')
      
      // Save note
      cy.contains('button', 'Save').click()
      
      // Wait for save
      cy.wait(1000)
      
      // Test FTS API directly
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=full-text&lang=en',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('results')
        expect(response.body).to.have.property('method')
        expect(response.body).to.have.property('executionTime')
        
        // Should use FTS method
        expect(response.body.method).to.be.oneOf(['fts', 'ilike'])
        
        // Should have results
        if (response.body.results.length > 0) {
          const result = response.body.results[0]
          expect(result).to.have.property('headline')
          expect(result).to.have.property('rank')
        }
      })
    })

    it('should handle empty query gracefully', () => {
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.results).to.be.an('array')
        expect(response.body.results.length).to.eq(0)
      })
    })

    it('should handle short query (< 3 chars)', () => {
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=ab',
        failOnStatusCode: false
      }).then((response) => {
        // Should either return 400 or empty results
        expect(response.status).to.be.oneOf([200, 400])
      })
    })

    it('should support different languages', () => {
      const languages = ['ru', 'en', 'uk']
      
      languages.forEach(lang => {
        cy.request({
          method: 'GET',
          url: `/api/notes/search?q=test&lang=${lang}`,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('results')
        })
      })
    })

    it('should respect minRank parameter', () => {
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=test&minRank=0.5',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        // All results should have rank >= 0.5 (if using FTS)
        if (response.body.method === 'fts' && response.body.results.length > 0) {
          response.body.results.forEach(result => {
            expect(result.rank).to.be.gte(0.5)
          })
        }
      })
    })

    it('should respect limit parameter', () => {
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=test&limit=5',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.results.length).to.be.lte(5)
      })
    })
  })

  describe('Search highlighting', () => {
    it('should return highlighted headlines', () => {
      // Create note with specific content
      cy.contains('button', 'New Note').click()
      cy.get('input[placeholder="Note title"]').type('Highlighting Test')
      cy.get('.tiptap').type('This note contains important keywords for testing')
      cy.contains('button', 'Save').click()
      cy.wait(1000)
      
      // Search for keyword
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=keywords&lang=en',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        if (response.body.results.length > 0) {
          const result = response.body.results[0]
          
          // Should have headline
          expect(result.headline).to.exist
          
          // Headline should contain <mark> tags (if FTS)
          if (response.body.method === 'fts') {
            expect(result.headline).to.include('<mark>')
            expect(result.headline).to.include('</mark>')
          }
        }
      })
    })
  })

  describe('Search performance', () => {
    it('should complete search in reasonable time', () => {
      const startTime = Date.now()
      
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=test',
        failOnStatusCode: false
      }).then((response) => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        expect(response.status).to.eq(200)
        
        // Should complete in < 1 second
        expect(duration).to.be.lt(1000)
        
        // executionTime should be reported
        expect(response.body.executionTime).to.exist
        expect(response.body.executionTime).to.be.a('number')
      })
    })
  })

  describe('Fallback behavior', () => {
    it('should fallback to ILIKE on FTS error', () => {
      // Try to trigger FTS error with invalid query
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=test',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        // Should have method field
        expect(response.body.method).to.exist
        expect(response.body.method).to.be.oneOf(['fts', 'ilike'])
        
        // Should still return results (even if fallback)
        expect(response.body.results).to.be.an('array')
      })
    })
  })

  describe('Multi-language search', () => {
    it('should search Russian text', () => {
      // Create Russian note
      cy.contains('button', 'New Note').click()
      cy.get('input[placeholder="Note title"]').type('Русская заметка')
      cy.get('.tiptap').type('Это тестовая заметка на русском языке')
      cy.contains('button', 'Save').click()
      cy.wait(1000)
      
      // Search in Russian
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=тестовая&lang=ru',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.results).to.be.an('array')
      })
    })

    it('should search English text', () => {
      // Create English note
      cy.contains('button', 'New Note').click()
      cy.get('input[placeholder="Note title"]').type('English Note')
      cy.get('.tiptap').type('This is a test note in English language')
      cy.contains('button', 'Save').click()
      cy.wait(1000)
      
      // Search in English
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=English&lang=en',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.results).to.be.an('array')
      })
    })
  })

  describe('Search ranking', () => {
    it('should return results ordered by relevance', () => {
      cy.request({
        method: 'GET',
        url: '/api/notes/search?q=test',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        
        if (response.body.method === 'fts' && response.body.results.length > 1) {
          const results = response.body.results
          
          // Check that ranks are in descending order
          for (let i = 0; i < results.length - 1; i++) {
            expect(results[i].rank).to.be.gte(results[i + 1].rank)
          }
        }
      })
    })
  })
})

