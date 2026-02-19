import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { useMemo, useState } from 'react'
import { featureFlags } from '@ui/mobile/featureFlags'
import { AuthService } from '@core/services/auth'
import { getOAuthRedirectUrl, oauthAdapter } from '@ui/mobile/adapters'
import { Button } from '@ui/mobile/components/ui'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookOpen } from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'

const testAuthEmail = process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL ?? ''
const testAuthPassword = process.env.EXPO_PUBLIC_TEST_AUTH_PASSWORD ?? ''

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
)

export default function LoginScreen() {
  const { client } = useSupabase()
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingTest, setLoadingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = useMemo(() => createStyles(colors, insets), [colors, insets])
  const loading = loadingGoogle || loadingTest

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true)
      setError(null)

      const authService = new AuthService(client)
      const redirectUrl = getOAuthRedirectUrl()
      const { data, error } = await authService.signInWithGoogle(redirectUrl)

      if (error) throw error
      if (!data.url) throw new Error('Missing OAuth URL')

      await oauthAdapter.startOAuth(data.url)
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoadingGoogle(false)
    }
  }

  const handleTestLogin = async () => {
    if (!featureFlags.testAuth) return

    try {
      if (!testAuthEmail || !testAuthPassword) {
        setError('Test credentials are not configured')
        return
      }

      setLoadingTest(true)
      setError(null)
      const authService = new AuthService(client)
      const { error } = await authService.signInWithPassword(
        testAuthEmail,
        testAuthPassword
      )

      if (error) throw error

      router.replace('/(tabs)')
    } catch (err) {
      console.error('Test login error:', err)
      setError(err instanceof Error ? err.message : 'Test login failed')
    } finally {
      setLoadingTest(false)
    }
  }

  return (
    <View style={styles.container}>
      <ThemeToggle style={styles.themeToggle} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <BookOpen color={colors.primary} size={40} />
        </View>

        <Text style={styles.title}>EverFreeNote</Text>
        <Text style={styles.subtitle}>
          Your notes are always with you. Secure, simple, and synchronized.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.form}>
          <Button
            size="lg"
            loading={loadingGoogle}
            disabled={loading}
            onPress={() => void handleGoogleLogin()}
            style={styles.googleButton}
          >
            <View style={styles.buttonContent}>
              {!loadingGoogle && <View style={styles.googleIconWrapper}><GoogleIcon /></View>}
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          </Button>

          {featureFlags.testAuth && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or try the app</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.testButtonsContainer}>
                <Button
                  variant="outline"
                  loading={loadingTest}
                  disabled={loading}
                  onPress={() => void handleTestLogin()}
                  style={styles.testButton}
                >
                  Test Login (Persistent)
                </Button>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], insets: { top: number; bottom: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 48,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  googleButton: {
    width: '100%',
    backgroundColor: colors.primary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconWrapper: {
    marginRight: 10,
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: colors.primaryForeground,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  testButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  testButton: {
    width: '100%',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.mutedForeground,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  error: {
    fontFamily: 'Inter_400Regular',
    color: colors.destructive,
    marginBottom: 16,
    textAlign: 'center',
  },
  themeToggle: {
    position: 'absolute',
    top: Math.max(insets.top, 16) + 16,
    right: 16,
    zIndex: 10,
  },
  footer: {
    paddingBottom: Math.max(insets.bottom, 16) + 16,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
})
