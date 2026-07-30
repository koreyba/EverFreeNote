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
      expect(buildTsQuery('C++')).to.equal('C++:*')
    })
  })
})
