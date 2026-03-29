import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Search, X } from 'lucide-react-native'
import type { MobileSearchViewMode } from '@ui/mobile/hooks/useMobileSearchMode'
import { useTheme } from '@ui/mobile/providers'
import { AiSearchPrecisionSlider } from './AiSearchPrecisionSlider'
import { AiSearchToggle } from './AiSearchToggle'
import { AiSearchViewTabs } from './AiSearchViewTabs'

type SearchControlsProps = {
  query: string
  placeholder: string
  onChangeQuery: (value: string) => void
  onClearQuery: () => void
  isAIEnabled: boolean
  onToggleAI: (enabled: boolean) => void
  aiToggleDisabled?: boolean
  viewMode: MobileSearchViewMode
  onChangeViewMode: (mode: MobileSearchViewMode) => void
  viewModeDisabled?: boolean
  precisionValue: number
  topK: number
  onChangePrecision: (value: number) => void
  onCommitPrecision: (value: number) => void
  precisionDisabled?: boolean
  precisionError?: string | null
  helperText?: string | null
}

export const SearchControls = memo(function SearchControls({
  query,
  placeholder,
  onChangeQuery,
  onClearQuery,
  isAIEnabled,
  onToggleAI,
  aiToggleDisabled = false,
  viewMode,
  onChangeViewMode,
  viewModeDisabled = false,
  precisionValue,
  topK,
  onChangePrecision,
  onCommitPrecision,
  precisionDisabled = false,
  precisionError = null,
  helperText = null,
}: SearchControlsProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={20} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={onChangeQuery}
          autoFocus
        />
        {query.length > 0 && (
          <Pressable onPress={onClearQuery} accessibilityRole="button" accessibilityLabel="Clear search">
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.aiRow}>
        <AiSearchToggle
          enabled={isAIEnabled}
          onChange={onToggleAI}
          disabled={aiToggleDisabled}
        />
        {isAIEnabled && (
          <AiSearchViewTabs
            value={viewMode}
            onChange={onChangeViewMode}
            disabled={viewModeDisabled}
          />
        )}
      </View>

      {isAIEnabled && (
        <AiSearchPrecisionSlider
          value={precisionValue}
          topK={topK}
          onChange={onChangePrecision}
          onCommit={onCommitPrecision}
          disabled={precisionDisabled}
        />
      )}

      {isAIEnabled && precisionError ? <Text style={styles.errorText}>{precisionError}</Text> : null}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_500Medium',
    color: colors.destructive,
  },
})
