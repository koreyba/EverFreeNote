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
const devSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim()
const devSupabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
if (!devSupabaseUrl) {
  console.warn('⚠️  EXPO_PUBLIC_SUPABASE_URL is not set in .env - dev build will not connect to Supabase')
}
if (!devSupabaseAnonKey) {
  console.warn('⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY is not set in .env - dev build may not authenticate')
}

const stageSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL_STAGE ?? '').trim()
const stageSupabasePublishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY_STAGE ?? '').trim()
const stageEditorWebViewUrl = (process.env.EXPO_PUBLIC_STAGE_EDITOR_WEBVIEW_URL ?? '').trim()

const prodSupabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL_PROD ?? '').trim()
const prodSupabasePublishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PROD ?? '').trim()
const prodEditorWebViewUrl = (process.env.EXPO_PUBLIC_PROD_EDITOR_WEBVIEW_URL ?? '').trim()

const variants: Record<AppVariant, VariantConfig> = {
  dev: {
    name: 'EverFreeNote Dev',
    slug: 'everfreenote-dev',
    scheme: 'everfreenote-dev',
    androidPackage: 'com.everfreenote.app.dev',
    icon: './assets/icon-dev.png',
    adaptiveIcon: './assets/adaptive-icon-dev.png',
    supabaseUrl: devSupabaseUrl,
    supabaseAnonKey: devSupabaseAnonKey,
    supabaseFunctionsUrl: devSupabaseUrl ? `${devSupabaseUrl}/functions/v1` : '',
  },
  stage: {
    name: 'EverFreeNote Stage',
    slug: 'everfreenote-stage',
    scheme: 'everfreenote-stage',
    androidPackage: 'com.everfreenote.app.stage',
    icon: './assets/icon-stage.png',
    adaptiveIcon: './assets/adaptive-icon-stage.png',
    supabaseUrl: stageSupabaseUrl,
    supabasePublishableKey: stageSupabasePublishableKey,
    supabaseFunctionsUrl: stageSupabaseUrl ? `${stageSupabaseUrl}/functions/v1` : '',
    editorWebViewUrl: stageEditorWebViewUrl,
  },
  prod: {
    name: 'EverFreeNote',
    slug: 'everfreenote',
    scheme: 'everfreenote',
    androidPackage: 'com.everfreenote.app',
    icon: './assets/icon.png',
    adaptiveIcon: './assets/adaptive-icon.png',
    supabaseUrl: prodSupabaseUrl,
    supabasePublishableKey: prodSupabasePublishableKey,
    supabaseFunctionsUrl: prodSupabaseUrl ? `${prodSupabaseUrl}/functions/v1` : '',
    editorWebViewUrl: prodEditorWebViewUrl,
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
  // Dev convenience: allow overriding the editor WebView URL from the local .env.
  // Important: do NOT let this override leak into stage/prod release builds.
  const devEditorWebViewUrl = (process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL ?? '').trim()
  if (variant === 'dev' && !devEditorWebViewUrl) {
    console.warn('Warning: EXPO_PUBLIC_EDITOR_WEBVIEW_URL is not set for dev builds (full /editor-webview URL required).')
  }
  const editorWebViewOverride = variant === 'dev' ? devEditorWebViewUrl : ''
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
      bundleIdentifier: variantConfig.androidPackage,
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
