import crypto from 'node:crypto'
import { getRandomFloat, getRandomElement, getRandomElements, generateNote } from '../../../scripts/generate-test-notes'

describe('generate-test-notes randomness helpers', () => {
  it('getRandomFloat generates a number strictly in range [0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const val = getRandomFloat()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('getRandomFloat handles maximum uint32 boundary without returning 1.0', () => {
    const spy = jest.spyOn(crypto, 'randomBytes').mockImplementation(() => Buffer.from([0xff, 0xff, 0xff, 0xff]) as any)
    const val = getRandomFloat()
    expect(val).toBeLessThan(1)
    expect(val).toBe(4294967295 / 4294967296)
    spy.mockRestore()
  })

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
