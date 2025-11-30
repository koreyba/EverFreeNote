export interface OAuthAdapter {
  /**
   * Starts platform-specific OAuth flow (web redirect or mobile custom tab/deep link).
   * The redirectUri should be platform-specific (e.g., https://.../auth/callback for web, everfreenote://auth/callback for mobile).
   */
  startOAuth(redirectUri: string): Promise<void>
}
