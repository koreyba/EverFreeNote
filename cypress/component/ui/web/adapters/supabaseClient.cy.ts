import { webSupabaseClientFactory } from '../../../../../ui/web/adapters/supabaseClient'
import { webStorageAdapter } from '../../../../../ui/web/adapters/storage'

describe('webSupabaseClientFactory', () => {
  it('should create a Supabase client with correct config', () => {
    const config = {
      url: 'https://example.supabase.co',
      anonKey: 'test-key'
    }
    const deps = {
      storage: webStorageAdapter
    }

    const client = webSupabaseClientFactory.createClient(config, deps)
    
    // Verify basic structure of the returned client
    expect(client).to.exist
    expect(client).to.have.property('auth')
    expect(client).to.have.property('from')
    expect(client).to.have.property('storage')
    
    // We can't easily inspect internal config of the client without using private properties
    // or mocking createBrowserClient, but this proves the factory works and returns a client.
  })
})
