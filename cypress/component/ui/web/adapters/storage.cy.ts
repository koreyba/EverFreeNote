import { webStorageAdapter } from '../../../../../ui/web/adapters/storage'

describe('webStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should set item in localStorage', async () => {
    const key = 'test-key'
    const value = 'test-value'
    await webStorageAdapter.setItem(key, value)
    expect(localStorage.getItem(key)).to.equal(value)
  })

  it('should get item from localStorage', async () => {
    const key = 'test-key'
    const value = 'test-value'
    localStorage.setItem(key, value)
    const result = await webStorageAdapter.getItem(key)
    expect(result).to.equal(value)
  })

  it('should return null for non-existent item', async () => {
    const result = await webStorageAdapter.getItem('non-existent')
    expect(result).to.be.null
  })

  it('should remove item from localStorage', async () => {
    const key = 'test-key'
    localStorage.setItem(key, 'value')
    await webStorageAdapter.removeItem(key)
    expect(localStorage.getItem(key)).to.be.null
  })
})
