import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native'
import { MoreVertical, Tag } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import type { MobileTagSummary } from '@ui/mobile/utils/tagManagement'

type TagManagementCardProps = Readonly<{
  tag: MobileTagSummary
  onPress: (_tag: string) => void
  onActions: (_tag: MobileTagSummary) => void
}>

export function TagManagementCard({ tag, onPress, onActions }: TagManagementCardProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const stopPropagation = (event: GestureResponderEvent) => {
    const nativeEvent = event as unknown as { stopPropagation?: () => void } | undefined
    nativeEvent?.stopPropagation?.()
  }

  return (
    <Pressable
      onPress={() => onPress(tag.name)}
      accessibilityRole="button"
      accessibilityLabel={`Open notes tagged ${tag.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.leading}>
        <Tag size={20} color={colors.mutedForeground} />
        <Text style={styles.name} numberOfLines={1}>{tag.name}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.count}>{tag.count}</Text>
        </View>
      </View>
      <Pressable
        onPress={(event) => {
          stopPropagation(event)
          onActions(tag)
        }}
        accessibilityRole="button"
        accessibilityLabel={`Actions for tag ${tag.name}`}
        hitSlop={8}
        style={({ pressed }) => [styles.actions, pressed && styles.actionsPressed]}
      >
        <MoreVertical size={20} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: colors.accent,
  },
  leading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: colors.foreground,
  },
  countBadge: {
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  count: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.secondaryForeground,
  },
  actions: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsPressed: {
    backgroundColor: colors.accent,
  },
})
