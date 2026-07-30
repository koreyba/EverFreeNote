import { generateUuidV4 } from '../../hooks/useNotesMutations'

describe('generateUuidV4', () => {
  const originalGlobalCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalGlobalCrypto,
      writable: true,
      configurable: true,
    })
  })

  it('uses randomUUID when available', () => {
    const mockRandomUUID = jest.fn().mockReturnValue('12345678-1234-4234-8234-123456789abc')
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: mockRandomUUID },
      writable: true,
      configurable: true,
    })

    const uuid = generateUuidV4()
    expect(mockRandomUUID).toHaveBeenCalled()
    expect(uuid).toBe('12345678-1234-4234-8234-123456789abc')
  })

  it('uses getRandomValues when randomUUID is absent', () => {
    const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
      arr[0] = 0x5a
      return arr
    })
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: mockGetRandomValues },
      writable: true,
      configurable: true,
    })

    const uuid = generateUuidV4()
    expect(mockGetRandomValues).toHaveBeenCalled()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('uses sequence fallback when crypto object is undefined', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const uuid1 = generateUuidV4()
    const uuid2 = generateUuidV4()

    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(uuid1).not.toBe(uuid2)
  })
})
