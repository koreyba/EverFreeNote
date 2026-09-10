import { aggregateTags, applyTagEdit, dedupeTags, filterTags, tagsUnchanged } from '@core/mcp/tagVocabulary'

describe('core/mcp/tagVocabulary', () => {
  describe('dedupeTags', () => {
    it('trims, drops blanks and removes case-insensitive duplicates keeping the first spelling', () => {
      expect(dedupeTags([' Work ', 'work', 'WORK', '', '   ', 'Home'])).toEqual(['Work', 'Home'])
    })

    it('handles a missing list', () => {
      expect(dedupeTags(undefined)).toEqual([])
      expect(dedupeTags([])).toEqual([])
    })
  })

  describe('aggregateTags', () => {
    it('counts notes per tag, not occurrences within a note', () => {
      expect(aggregateTags([['work', 'work'], ['work'], ['home']])).toEqual([
        { name: 'work', count: 2 },
        { name: 'home', count: 1 },
      ])
    })

    it('folds case and reports the first spelling seen', () => {
      expect(aggregateTags([['Work'], ['work'], ['WORK']])).toEqual([{ name: 'Work', count: 3 }])
    })

    it('orders by count then alphabetically', () => {
      const result = aggregateTags([['b', 'a'], ['a'], ['c'], ['b']])
      expect(result).toEqual([
        { name: 'a', count: 2 },
        { name: 'b', count: 2 },
        { name: 'c', count: 1 },
      ])
    })

    it('ignores blank tags and empty notes', () => {
      expect(aggregateTags([[], ['', '  '], ['x']])).toEqual([{ name: 'x', count: 1 }])
    })
  })

  describe('filterTags', () => {
    const tags = [
      { name: 'Work', count: 3 },
      { name: 'homework', count: 2 },
      { name: 'ideas', count: 1 },
    ]

    it('returns everything when there is no query', () => {
      expect(filterTags(tags, null)).toEqual(tags)
      expect(filterTags(tags, '   ')).toEqual(tags)
    })

    it('matches a case-insensitive substring anywhere in the name', () => {
      expect(filterTags(tags, 'work').map((tag) => tag.name)).toEqual(['Work', 'homework'])
      expect(filterTags(tags, 'IDEA').map((tag) => tag.name)).toEqual(['ideas'])
      expect(filterTags(tags, 'zzz')).toEqual([])
    })

    it('does not mutate the input', () => {
      const copy = [...tags]
      filterTags(tags, 'work')
      expect(tags).toEqual(copy)
    })
  })

  describe('applyTagEdit', () => {
    it('adds a new tag keeping the existing ones and their order', () => {
      expect(applyTagEdit(['home', 'work'], { add: ['urgent'], remove: [] })).toEqual(['home', 'work', 'urgent'])
    })

    it('ignores a tag that is already present, whatever its case', () => {
      expect(applyTagEdit(['Work'], { add: ['work', 'WORK'], remove: [] })).toEqual(['Work'])
    })

    it('removes case-insensitively and leaves the rest untouched', () => {
      expect(applyTagEdit(['Home', 'Work', 'Ideas'], { add: [], remove: ['WORK'] })).toEqual(['Home', 'Ideas'])
    })

    it('ignores removing a tag that is not there', () => {
      expect(applyTagEdit(['home'], { add: [], remove: ['missing'] })).toEqual(['home'])
    })

    it('applies removals before additions so a tag can be re-spelled', () => {
      expect(applyTagEdit(['work'], { add: ['Work'], remove: ['work'] })).toEqual(['Work'])
    })

    it('trims and de-duplicates the incoming lists', () => {
      expect(applyTagEdit([], { add: [' a ', 'a', 'A', 'b'], remove: [] })).toEqual(['a', 'b'])
    })

    it('cleans blanks and duplicates already stored on the note', () => {
      expect(applyTagEdit(['a', 'A', '', ' b '], { add: [], remove: [] })).toEqual(['a', 'b'])
    })
  })

  describe('tagsUnchanged', () => {
    it('compares by value and order', () => {
      expect(tagsUnchanged(['a', 'b'], ['a', 'b'])).toBe(true)
      expect(tagsUnchanged(['a', 'b'], ['b', 'a'])).toBe(false)
      expect(tagsUnchanged(['a'], ['a', 'b'])).toBe(false)
      expect(tagsUnchanged([], [])).toBe(true)
    })
  })
})
