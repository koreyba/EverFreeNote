import type { SupabaseClient } from '@supabase/supabase-js'

export class AuthService {
  constructor(private supabase: SupabaseClient) { }

  /**
   * `skipBrowserRedirect` returns the provider URL instead of navigating to it, which
   * is what the Android shell needs so it can open the URL in a Custom Tab.
   */
  async signInWithGoogle(redirectTo: string, options?: { skipBrowserRedirect?: boolean }) {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: options?.skipBrowserRedirect },
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
