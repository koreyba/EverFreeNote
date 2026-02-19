import React, { useMemo, useEffect } from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useTheme } from '@ui/mobile/providers'

interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  isPending: boolean
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  isPending,
}: BulkActionBarProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const styles = useMemo(() => createStyles(colors), [colors])

  const translateY = useSharedValue(100)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 })
  }, [translateY])

  const allSelected = selectedCount === totalCount && totalCount > 0
  const deleteDisabled = selectedCount === 0 || isPending

  return (
    <Animated.View style={[styles.container, { bottom: tabBarHeight, paddingBottom: insets.bottom > 0 ? 0 : 8 }, animatedStyle]}>
      <Pressable
        style={styles.selectButton}
        onPress={allSelected ? onDeselectAll : onSelectAll}
        accessibilityRole="button"
        accessibilityLabel={allSelected ? 'Deselect all' : `Select all ${totalCount} notes`}
      >
        <Text style={styles.selectButtonText}>
          {allSelected ? 'Deselect All' : `Select All (${totalCount})`}
        </Text>
      </Pressable>

      <Text style={styles.counter}>
        {selectedCount} selected
      </Text>

      <Pressable
        style={[styles.deleteButton, deleteDisabled && styles.deleteButtonDisabled]}
        onPress={onDelete}
        disabled={deleteDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${selectedCount} notes`}
        accessibilityState={{ disabled: deleteDisabled }}
      >
        <Text style={[styles.deleteButtonText, deleteDisabled && styles.deleteButtonTextDisabled]}>
          Delete
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 110,
  },
  selectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
  counter: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
    minWidth: 80,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.destructiveForeground,
  },
  deleteButtonTextDisabled: {
    color: colors.destructiveForeground,
  },
})
