import { getRandomElement, getRandomElements, generateNote } from '../../../scripts/generate-test-notes'

describe('generate-test-notes randomness helpers', () => {
  it('getRandomElement picks an element from an array', () => {
    const array = ['apple', 'banana', 'cherry']
    const picked = getRandomElement(array)
    expect(array).toContain(picked)
  })

  it('getRandomElements returns specified count of elements', () => {
    const array = ['a', 'b', 'c', 'd', 'e']
    const picked = getRandomElements(array, 3)
    expect(picked).toHaveLength(3)
    picked.forEach(item => expect(array).toContain(item))
  })

  it('generateNote produces a valid note structure', () => {
    const note = generateNote(0)
    expect(note).toHaveProperty('title')
    expect(note.title).toContain('#1')
    expect(note).toHaveProperty('description')
    expect(typeof note.description).toBe('string')
    expect(note).toHaveProperty('created_at')
    expect(typeof note.created_at).toBe('string')
  })
})
