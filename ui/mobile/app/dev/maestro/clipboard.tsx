import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native'
import { Stack } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import { NoteCopyService } from '@core/services/noteCopy'
import { rememberMobileNoteCopyPayload } from '@ui/mobile/utils/noteClipboardCache'
import { useTheme } from '@ui/mobile/providers'
import { writeNoteCopyPayloadToClipboard } from '@ui/mobile/utils/writeNoteCopyPayloadToClipboard'

const FIXTURE_HTML = '<h1>Fixture Heading</h1><h2>Fixture Subheading</h2>'
const FIXTURE_COPY_PAYLOAD = NoteCopyService.buildPayload(FIXTURE_HTML)

type ClipboardSnapshot = {
  html: string
  text: string
}

const EMPTY_CLIPBOARD_SNAPSHOT: ClipboardSnapshot = {
  html: '',
  text: '',
}

export default function MaestroClipboardScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [snapshot, setSnapshot] = useState<ClipboardSnapshot>(EMPTY_CLIPBOARD_SNAPSHOT)

  const handleCopyFixture = async () => {
    try {
      await writeNoteCopyPayloadToClipboard(FIXTURE_COPY_PAYLOAD)
      rememberMobileNoteCopyPayload(FIXTURE_COPY_PAYLOAD)
      Toast.show({ type: 'success', text1: 'Fixture copied' })
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to copy fixture' })
    }
  }

  const handleReadClipboard = async () => {
    try {
      const [html, text] = await Promise.all([
        Clipboard.getStringAsync({ preferredFormat: Clipboard.StringFormat.HTML }),
        Clipboard.getStringAsync({ preferredFormat: Clipboard.StringFormat.PLAIN_TEXT }),
      ])
      setSnapshot({ html, text })
    } catch {
      setSnapshot({
        html: '[clipboard read failed]',
        text: '[clipboard read failed]',
      })
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Maestro Clipboard Lab' }} />

      <View style={styles.section}>
        <Text style={styles.eyebrow}>Maestro Harness</Text>
        <Text style={styles.title}>Clipboard Copy Smoke Test</Text>
        <Text style={styles.description}>
          This screen intentionally isolates the mobile clipboard transport from note CRUD so the
          first Maestro flow can verify rich clipboard writes deterministically.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fixture HTML</Text>
        <Text selectable testID="maestro-fixture-html" style={styles.codeBlock}>
          {FIXTURE_COPY_PAYLOAD.html}
        </Text>
        <Text style={styles.cardTitle}>Fixture Plain Text</Text>
        <Text selectable testID="maestro-fixture-text" style={styles.codeBlock}>
          {FIXTURE_COPY_PAYLOAD.text}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          testID="maestro-copy-fixture-button"
          accessibilityLabel="Copy fixture note"
          accessibilityRole="button"
          onPress={() => {
            void handleCopyFixture()
          }}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.primaryButtonText}>Copy fixture note</Text>
        </Pressable>
        <Pressable
          testID="maestro-read-clipboard-button"
          accessibilityLabel="Read clipboard formats"
          accessibilityRole="button"
          onPress={() => {
            void handleReadClipboard()
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.secondaryButtonText}>Read clipboard formats</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Clipboard HTML</Text>
        <Text selectable testID="maestro-clipboard-html-output" style={styles.codeBlock}>
          {snapshot.html || '(empty)'}
        </Text>
        <Text style={styles.cardTitle}>Clipboard Plain Text</Text>
        <Text selectable testID="maestro-clipboard-text-output" style={styles.codeBlock}>
          {snapshot.text || '(empty)'}
        </Text>
      </View>
    </ScrollView>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  codeBlock: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 12,
  },
  buttonRow: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.background,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  buttonPressed: {
    opacity: 0.8,
  },
})
