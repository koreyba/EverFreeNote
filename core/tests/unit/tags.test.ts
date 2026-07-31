import {
  getTagsWithCounts,
  groupTagsAlphabetically,
  renameTagInNotes,
  deleteTagFromNotes,
} from '../../services/tags'

describe('core/services/tags', () => {
  const sampleNotes = [
    { id: '1', title: 'Note 1', tags: ['javascript', 'React', 'Заметки'] },
    { id: '2', title: 'Note 2', tags: ['react', 'TypeScript', 'Архив'] },
    { id: '3', title: 'Note 3', tags: ['JAVASCRIPT', 'заметки', '123tag'] },
  ]

  describe('getTagsWithCounts', () => {
    it('extracts unique tags with correct note usage counts and sorted order', () => {
      const tags = getTagsWithCounts(sampleNotes)

      expect(tags).toEqual([
        { name: '123tag', count: 1 },
        { name: 'Архив', count: 1 },
        { name: 'Заметки', count: 2 },
        { name: 'javascript', count: 2 },
        { name: 'React', count: 2 },
        { name: 'TypeScript', count: 1 },
      ])
    })

    it('deduplicates duplicate tags within a single note', () => {
      const notes = [{ id: '1', tags: ['react', 'REACT', 'React'] }]
      const tags = getTagsWithCounts(notes)
      expect(tags).toEqual([{ name: 'react', count: 1 }])
    })

    it('handles empty or missing tags gracefully', () => {
      const notes = [{ id: '1' }, { id: '2', tags: [] }, { id: '3', tags: ['  ', ''] }]
      expect(getTagsWithCounts(notes)).toEqual([])
    })
  })

  describe('groupTagsAlphabetically', () => {
    it('groups tags into Latin, Cyrillic, and symbol (#) groups', () => {
      const tags = getTagsWithCounts(sampleNotes)
      const groups = groupTagsAlphabetically(tags)

      expect(groups).toEqual([
        {
          letter: 'А',
          tags: [{ name: 'Архив', count: 1 }],
        },
        {
          letter: 'З',
          tags: [{ name: 'Заметки', count: 2 }],
        },
        {
          letter: 'J',
          tags: [{ name: 'javascript', count: 2 }],
        },
        {
          letter: 'R',
          tags: [{ name: 'React', count: 2 }],
        },
        {
          letter: 'T',
          tags: [{ name: 'TypeScript', count: 1 }],
        },
        {
          letter: '#',
          tags: [{ name: '123tag', count: 1 }],
        },
      ])
    })
  })

  describe('renameTagInNotes', () => {
    it('renames tag across notes case-insensitively and updates immutably', () => {
      const updated = renameTagInNotes(sampleNotes, 'react', 'ReactJS')

      expect(updated[0].tags).toEqual(['javascript', 'ReactJS', 'Заметки'])
      expect(updated[1].tags).toEqual(['ReactJS', 'TypeScript', 'Архив'])
      // Note 3 has no react tag, should be unchanged instance
      expect(updated[2]).toBe(sampleNotes[2])
    })

    it('prevents duplicate tag addition if replacement tag already exists in note', () => {
      const notes = [{ id: '1', tags: ['js', 'javascript'] }]
      const updated = renameTagInNotes(notes, 'js', 'javascript')

      expect(updated[0].tags).toEqual(['javascript'])
    })

    it('returns original notes array if oldTag or newTag is empty', () => {
      expect(renameTagInNotes(sampleNotes, '', 'React')).toBe(sampleNotes)
      expect(renameTagInNotes(sampleNotes, 'React', '   ')).toBe(sampleNotes)
    })
  })

  describe('deleteTagFromNotes', () => {
    it('deletes tag across notes case-insensitively and returns new notes', () => {
      const updated = deleteTagFromNotes(sampleNotes, 'ЗАМЕТКИ')

      expect(updated[0].tags).toEqual(['javascript', 'React'])
      expect(updated[1]).toBe(sampleNotes[1]) // Unchanged
      expect(updated[2].tags).toEqual(['JAVASCRIPT', '123tag'])
    })

    it('returns original notes array if targetTag is empty', () => {
      expect(deleteTagFromNotes(sampleNotes, '  ')).toBe(sampleNotes)
    })
  })
})
