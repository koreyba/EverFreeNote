/** Types for the CommonJS build helper, so it can be imported from TypeScript tests. */
export declare function readAppId(gradle: string): string | undefined
export declare function needsRegeneration(gradle: string, expectedAppId: string): boolean
export declare function addOAuthScheme(manifest: string, scheme: string): { manifest: string; changed: boolean }
export declare function addSigningConfig(gradle: string): { gradle: string; changed: boolean }
export declare function resolveTarget(
  env: Record<string, string | undefined>,
  variants: Record<string, { appId: string; scheme: string }>
): { variant: string; scheme: string; appId: string }
