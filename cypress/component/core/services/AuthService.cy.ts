import { AuthService } from '@core/services/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('core/services/AuthService', () => {
  let mockSupabase: SupabaseClient
  let service: AuthService

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signInWithOAuth: cy.stub().resolves({ error: null }),
        signInWithPassword: cy.stub().resolves({ data: { user: { id: '1' } }, error: null }),
        signOut: cy.stub().resolves({ error: null }),
        getSession: cy.stub().resolves({ data: { session: { user: { id: '1' } } }, error: null })
      }
    } as unknown as SupabaseClient

    service = new AuthService(mockSupabase)
  })

  it('signInWithGoogle', async () => {
    await service.signInWithGoogle('http://localhost:3000')
    expect(mockSupabase.auth.signInWithOAuth).to.have.been.calledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000' }
    })
  })

  it('signInWithPassword', async () => {
    await service.signInWithPassword('test@example.com', 'password')
    expect(mockSupabase.auth.signInWithPassword).to.have.been.calledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('signOut', async () => {
    await service.signOut()
    expect(mockSupabase.auth.signOut).to.have.been.called
  })

  it('getSession', async () => {
    await service.getSession()
    expect(mockSupabase.auth.getSession).to.have.been.called
  })
})
