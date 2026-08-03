import type { Note } from '@core/types/domain'
import {
  filterMobileTagSummaries,
  getMobileTagLetters,
  getMobileTagSummaries,
  groupMobileTagSummaries,
} from '@ui/mobile/utils/tagManagement'

const note = (id: string, tags: string[]): Note => ({
  id,
  title: id,
  description: '',
  tags,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
})
describe('mobile tag management derivation', () => {
  it('preserves canonical casing and counts each normalized tag once per note', () => {
    const tags = getMobileTagSummaries([
      note('one', [' Work ', 'WORK', 'Бета']),
      note('two', ['work', '#todo']),
    ])

    expect(tags).toEqual([
      { name: 'Бета', count: 1, letter: 'Б' },
      { name: 'Work', count: 2, letter: 'W' },
      { name: '#todo', count: 1, letter: '#' },
    ])
  })

  it('filters by search and explicitly selected letter', () => {
    const tags = [
      { name: 'Alpha', count: 1, letter: 'A' },
      { name: 'Beta', count: 2, letter: 'B' },
      { name: 'Another', count: 1, letter: 'A' },
    ]

    expect(filterMobileTagSummaries(tags, 'alp', null)).toEqual([tags[0]])
    expect(filterMobileTagSummaries(tags, '', 'B')).toEqual([tags[1]])
  })

  it('returns stable available letters and groups visible tags', () => {
    const tags = [
      { name: 'Alpha', count: 1, letter: 'A' },
      { name: 'Beta', count: 2, letter: 'B' },
      { name: '#todo', count: 1, letter: '#' },
    ]

    expect(getMobileTagLetters(tags)).toEqual(['A', 'B', '#'])
    expect(groupMobileTagSummaries(tags)).toEqual([
      { letter: 'A', tags: [tags[0]] },
      { letter: 'B', tags: [tags[1]] },
      { letter: '#', tags: [tags[2]] },
    ])
  })
})
