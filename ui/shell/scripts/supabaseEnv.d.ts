/** Types for the CommonJS build helper, so it can be imported from TypeScript tests. */
export type SupabaseEnvResolution = {
  env: Record<string, string>
  source: string
  usingPlaceholders: boolean
  url?: string
}

export declare function resolveSupabaseEnv(options: {
  variant: 'dev' | 'stage' | 'prod'
  env: Record<string, string | undefined>
  readFromEnvFiles: (name: string) => string | undefined
}): SupabaseEnvResolution

export declare function projectRef(url: string | undefined): string

export declare const PLACEHOLDER_URL: string
export declare const PLACEHOLDER_KEY: string
