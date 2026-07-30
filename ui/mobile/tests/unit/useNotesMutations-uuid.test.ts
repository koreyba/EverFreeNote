import * as Crypto from 'expo-crypto'
import { generateUuidV4 } from '../../hooks/useNotesMutations'

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}))

describe('generateUuidV4', () => {
  const randomUUIDMock = Crypto.randomUUID as jest.MockedFunction<typeof Crypto.randomUUID>

  afterEach(() => {
    randomUUIDMock.mockReset()
  })

  it('uses the platform crypto implementation for offline note IDs', () => {
    randomUUIDMock.mockReturnValue('12345678-1234-4234-8234-123456789abc')

    const uuid = generateUuidV4()

    expect(randomUUIDMock).toHaveBeenCalledTimes(1)
    expect(uuid).toBe('12345678-1234-4234-8234-123456789abc')
  })
})
