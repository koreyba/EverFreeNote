import React, { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '@ui/mobile/providers'
import { htmlToPlainText } from '@ui/mobile/utils/htmlToPlainText'

type NoteBodyPreviewProps = {
  html: string
  colors: ReturnType<typeof useTheme>['colors']
}

export function NoteBodyPreview({ html, colors }: NoteBodyPreviewProps) {
  const styles = useMemo(() => createStyles(colors), [colors])
  const text = useMemo(() => htmlToPlainText(html), [html])

  if (!text) {
    return <View style={styles.container} />
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.text}>{text}</Text>
    </ScrollView>
  )
}

// Preview styles are aligned with the WebView editor:
// - px-6 py-4 = 24px horizontal, 16px vertical
// - font-size: 12pt (~16px)
// - line-height: 1.75 (16 * 1.75 = 28)
// - bg-background
const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
    lineHeight: 28,
  },
})
