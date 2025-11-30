import { buildTsQuery } from '../../../core/utils/search'

describe('Search Utils', () => {
  context('buildTsQuery', () => {
    it('should handle simple queries', () => {
      expect(buildTsQuery('hello')).to.equal('hello:*')
      expect(buildTsQuery('hello world')).to.equal('hello:* & world:*')
    })

    it('should handle special characters by stripping them', () => {
      expect(buildTsQuery('hello)')).to.equal('hello:*')
      expect(buildTsQuery('(hello)')).to.equal('hello:*')
      expect(buildTsQuery('hello & world')).to.equal('hello:* & world:*')
    })

    it('should return null on empty query after sanitization', () => {
      expect(buildTsQuery(')')).to.be.null
      expect(buildTsQuery('   ')).to.be.null
    })

    it('should handle C++', () => {
      // Current implementation keeps +
      // expect(buildTsQuery('C++')).to.equal('C++:*') 
      // We want to see what it does now
      const result = buildTsQuery('C++')
      console.log('C++ result:', result)
    })
  })
})
