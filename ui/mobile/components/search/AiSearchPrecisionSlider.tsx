import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'

import {
  RAG_SEARCH_THRESHOLD_MAX,
  RAG_SEARCH_THRESHOLD_MIN,
  RAG_SEARCH_THRESHOLD_STEP,
} from '@core/rag/searchSettings'
import { useTheme } from '@ui/mobile/providers'

type AiSearchPrecisionSliderProps = {
  value: number
  disabled?: boolean
  topK: number
  onChange: (value: number) => void
  onCommit: (value: number) => void
}

export const AiSearchPrecisionSlider = memo(function AiSearchPrecisionSlider({
  value,
  disabled = false,
  topK,
  onChange,
  onCommit,
}: AiSearchPrecisionSliderProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>Precision</Text>
          <Text style={styles.description}>
            Lower values return more results. Higher values keep results cleaner.
          </Text>
        </View>
        <View style={styles.metrics}>
          <Text style={styles.metricValue}>{value.toFixed(2)}</Text>
          <Text style={styles.metricLabel}>Top K {topK}</Text>
        </View>
      </View>

      <Slider
        testID="ai-search-precision-slider"
        value={value}
        minimumValue={RAG_SEARCH_THRESHOLD_MIN}
        maximumValue={RAG_SEARCH_THRESHOLD_MAX}
        step={RAG_SEARCH_THRESHOLD_STEP}
        disabled={disabled}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        onValueChange={onChange}
        onSlidingComplete={onCommit}
      />

      <View style={styles.labelsRow}>
        <Text style={styles.edgeLabel}>More results</Text>
        <Text style={styles.edgeLabel}>Cleaner results</Text>
      </View>
    </View>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    containerDisabled: {
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    description: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    metrics: {
      alignItems: 'flex-end',
      gap: 2,
    },
    metricValue: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    edgeLabel: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
  })
