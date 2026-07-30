import crypto from 'node:crypto'
import { generateNote, getRandomElement, getRandomElements } from '../../../scripts/generate-test-notes'

describe('generate-test-notes randomness helpers', () => {
  const randomIntSpy = jest.spyOn(crypto, 'randomInt') as unknown as jest.SpiedFunction<
    (min: number, max: number) => number
  >

  afterEach(() => {
    randomIntSpy.mockReset()
    jest.useRealTimers()
  })

  afterAll(() => {
    randomIntSpy.mockRestore()
  })

  it('selects an element using the cryptographic random index', () => {
    const array = ['apple', 'banana', 'cherry']
    randomIntSpy.mockReturnValue(1)

    const picked = getRandomElement(array)

    expect(picked).toBe('banana')
    expect(randomIntSpy).toHaveBeenCalledWith(0, array.length)
  })

  it('rejects an empty array instead of returning an impossible T value', () => {
    expect(() => getRandomElement([])).toThrow(
      new RangeError('Cannot select a random element from an empty array')
    )
  })

  it('returns the requested number of distinct source elements', () => {
    const array = ['a', 'b', 'c', 'd', 'e']
    randomIntSpy.mockImplementation((min) => min)

    const picked = getRandomElements(array, 3)

    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    expect(picked.every((item) => array.includes(item))).toBe(true)
    expect(array).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('generates the minimum paragraph, tag, and age boundaries', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T12:00:00.000Z'))
    randomIntSpy.mockImplementation((min) => min)

    const note = generateNote(0)

    expect(note.title).toBe('Meeting Notes #1')
    expect(note.description.match(/Lorem ipsum dolor sit amet/g)).toHaveLength(1)
    expect(note.tags).toHaveLength(1)
    expect(note.created_at).toBe('2026-07-30T12:00:00.000Z')
    expect(note.updated_at).toBe(note.created_at)
  })

  it('keeps the maximum generated values inside their exclusive upper bounds', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T12:00:00.000Z'))
    randomIntSpy.mockImplementation((_min, max) => max - 1)

    const note = generateNote(0)

    expect(note.title).toBe('Conference Notes #1')
    expect(note.description.match(/Lorem ipsum dolor sit amet/g)).toHaveLength(5)
    expect(note.tags).toHaveLength(4)
    expect(note.created_at).toBe('2025-07-31T12:00:00.000Z')
    expect(note.updated_at).toBe(note.created_at)
  })
})
