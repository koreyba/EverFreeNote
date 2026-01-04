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
}

const variants: Record<AppVariant, VariantConfig> = {
  dev: {
    name: 'EverFreeNote Dev',
    slug: 'everfreenote-dev',
    scheme: 'everfreenote-dev',
    androidPackage: 'com.everfreenote.app.dev',
    icon: './assets/icon-dev.png',
    adaptiveIcon: './assets/adaptive-icon-dev.png',
    supabaseUrl: 'http://192.168.0.11:54321',
    supabaseAnonKey:
      'REDACTED_JWT',
    supabaseFunctionsUrl: 'http://192.168.0.11:54321/functions/v1',
  },
  stage: {
    name: 'EverFreeNote Stage',
    slug: 'everfreenote-stage',
    scheme: 'everfreenote-stage',
    androidPackage: 'com.everfreenote.app.stage',
    icon: './assets/icon-stage.png',
    adaptiveIcon: './assets/adaptive-icon-stage.png',
    supabaseUrl: 'https://yabcuywqxgjlruuyhwin.supabase.co',
    supabasePublishableKey: 'REDACTED_PUBLISHABLE',
    supabaseFunctionsUrl: 'https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1',
  },
  prod: {
    name: 'EverFreeNote',
    slug: 'everfreenote',
    scheme: 'everfreenote',
    androidPackage: 'com.everfreenote.app',
    icon: './assets/icon.png',
    adaptiveIcon: './assets/adaptive-icon.png',
    supabaseUrl: 'https://pmlloiywmuglbjkhrggo.supabase.co',
    supabasePublishableKey: 'REDACTED_PUBLISHABLE',
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

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant()
  const variantConfig = variants[variant]
  const editorWebViewOverride = (process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL ?? '').trim()
  const oauthRedirectOverride = (process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL ?? '').trim()

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
      editorWebViewUrl: editorWebViewOverride || variantConfig.editorWebViewUrl,
      oauthRedirectUrl: oauthRedirectOverride || `${variantConfig.scheme}://auth/callback`,
    },
  }
}
