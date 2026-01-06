import type { ConfigContext, ExpoConfig } from '@expo/config'

type AppVariant = 'dev' | 'stage' | 'prod'

type VariantConfig = {
  name: string
  slug: string
  scheme: string
  androidPackage: string
  icon: string
  adaptiveIcon: string
  supabaseUrl: string
  supabaseAnonKey?: string
  supabasePublishableKey?: string
  supabaseFunctionsUrl: string
  editorWebViewUrl?: string
  requireEditorWebViewUrl?: boolean
}

// For dev: MUST set EXPO_PUBLIC_SUPABASE_URL in .env (use your computer's local IP, not 127.0.0.1)
const devSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
if (!devSupabaseUrl) {
  console.warn('⚠️  EXPO_PUBLIC_SUPABASE_URL is not set in .env - dev build will not connect to Supabase')
}

const variants: Record<AppVariant, VariantConfig> = {
  dev: {
    name: 'EverFreeNote Dev',
    slug: 'everfreenote-dev',
    scheme: 'everfreenote-dev',
    androidPackage: 'com.everfreenote.app.dev',
    icon: './assets/icon-dev.png',
    adaptiveIcon: './assets/adaptive-icon-dev.png',
    supabaseUrl: devSupabaseUrl,
    supabaseAnonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    supabaseFunctionsUrl: `${devSupabaseUrl}/functions/v1`,
  },
  stage: {
    name: 'EverFreeNote Stage',
    slug: 'everfreenote-stage',
    scheme: 'everfreenote-stage',
    androidPackage: 'com.everfreenote.app.stage',
    icon: './assets/icon-stage.png',
    adaptiveIcon: './assets/adaptive-icon-stage.png',
    supabaseUrl: 'https://yabcuywqxgjlruuyhwin.supabase.co',
    supabasePublishableKey: 'sb_publishable_N_ZnirEdste9qYdS5--ThQ_oJrj1JmI',
    supabaseFunctionsUrl: 'https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1',
    editorWebViewUrl: 'https://stage.everfreenote.pages.dev/editor-webview',
  },
  prod: {
    name: 'EverFreeNote',
    slug: 'everfreenote',
    scheme: 'everfreenote',
    androidPackage: 'com.everfreenote.app',
    icon: './assets/icon.png',
    adaptiveIcon: './assets/adaptive-icon.png',
    supabaseUrl: 'https://pmlloiywmuglbjkhrggo.supabase.co',
    supabasePublishableKey: 'sb_publishable_FIrv4LN4QtDnpNbc3N2isg_NJQu5JKK',
    supabaseFunctionsUrl: 'https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1',
    editorWebViewUrl: 'https://everfreenote.pages.dev/editor-webview',
  },
}

const resolveVariant = (): AppVariant => {
  const rawVariant = (process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? '').trim()
  const normalized = rawVariant.toLowerCase()
  const alias: Record<string, AppVariant> = {
    dev: 'dev',
    development: 'dev',
    stage: 'stage',
    staging: 'stage',
    prod: 'prod',
    production: 'prod',
  }

  if (normalized in alias) {
    return alias[normalized]
  }

  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
}

const resolveStageWebViewUrl = (): string => {
  const rawBranch = (process.env.EXPO_PUBLIC_STAGE_BRANCH ?? '').trim()
  const rawDomain = (process.env.EXPO_PUBLIC_STAGE_DOMAIN ?? '').trim()
  if (!rawBranch || !rawDomain) return ''

  const domain = rawDomain.replace(/^https?:\/\//i, '')
  if (!domain) return ''

  return `https://${rawBranch}.${domain}/editor-webview`
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant()
  const variantConfig = variants[variant]
  const editorWebViewOverride = (process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL ?? '').trim()
  const stageWebViewUrl = resolveStageWebViewUrl()
  const oauthRedirectOverride = (process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL ?? '').trim()
  const resolvedEditorWebViewUrl =
    editorWebViewOverride ||
    (variant === 'stage' && stageWebViewUrl ? stageWebViewUrl : variantConfig.editorWebViewUrl)

  return {
    ...config,
    name: variantConfig.name,
    slug: variantConfig.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: variantConfig.icon,
    userInterfaceStyle: 'automatic',
    scheme: variantConfig.scheme,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.everfreenote.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        backgroundColor: '#ffffff',
      },
      package: variantConfig.androidPackage,
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-sqlite',
        {
          enableFTS: true,
        },
      ],
      'expo-asset',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant: variant,
      supabaseUrl: variantConfig.supabaseUrl,
      supabaseAnonKey: variantConfig.supabaseAnonKey,
      supabasePublishableKey: variantConfig.supabasePublishableKey,
      supabaseFunctionsUrl: variantConfig.supabaseFunctionsUrl,
      editorWebViewUrl: resolvedEditorWebViewUrl,
      requireEditorWebViewUrl: variantConfig.requireEditorWebViewUrl ?? false,
      oauthRedirectUrl: oauthRedirectOverride || `${variantConfig.scheme}://auth/callback`,
    },
  }
}
