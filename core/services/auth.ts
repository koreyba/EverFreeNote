import type { SupabaseClient } from '@supabase/supabase-js'

export class AuthService {
  constructor(private supabase: SupabaseClient) { }

  async signInWithGoogle(redirectTo: string) {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password })
  }

  async signOut() {
    return this.supabase.auth.signOut()
  }

  async getSession() {
    return this.supabase.auth.getSession()
  }

  async deleteAccount() {
    const { data, error } = await this.supabase.functions.invoke('delete-account', {
      body: { deleteNotes: true },
    })

    if (error) {
      throw new Error(error.message || 'Failed to delete account')
    }

    return data
  }
}
