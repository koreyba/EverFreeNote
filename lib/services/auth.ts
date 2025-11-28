import { SupabaseClient } from '@supabase/supabase-js';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  async signInWithGoogle(redirectTo: string) {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
  }

  async signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }
}
