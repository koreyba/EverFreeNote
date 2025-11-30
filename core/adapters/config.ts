export interface SupabaseConfig {
  url: string
  anonKey: string
}

export interface OAuthConfig {
  webRedirectUri?: string
  mobileRedirectUri?: string
}

export interface CoreConfig {
  supabase: SupabaseConfig
  oauth?: OAuthConfig
}
