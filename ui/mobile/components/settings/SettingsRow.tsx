import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'

interface SettingsRowProps {
    title: string
    subtitle?: string
    /** Element shown on the right (badge, status indicator, etc.) */
    right?: React.ReactNode
    onPress?: () => void
    disabled?: boolean
    showChevron?: boolean
    isFirst?: boolean
    isLast?: boolean
}

export function SettingsRow({
    title,
    subtitle,
    right,
    onPress,
    disabled = false,
    showChevron = true,
    isFirst = false,
    isLast = false,
}: SettingsRowProps) {
    const { colors } = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])

    return (
        <Pressable
            disabled={disabled || !onPress}
            style={({ pressed }) => [
                styles.row,
                isFirst && styles.rowFirst,
                isLast && styles.rowLast,
                !isLast && styles.rowBorder,
                pressed && onPress && !disabled && styles.rowPressed,
                disabled && styles.rowDisabled,
            ]}
            onPress={disabled ? undefined : onPress}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel={title}
            accessibilityState={onPress ? { disabled } : undefined}
        >
            <View style={styles.rowContent}>
                <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}>{title}</Text>
                    {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
                </View>
                <View style={styles.rowRight}>
                    {right}
                    {showChevron && onPress && !disabled && (
                        <ChevronRight size={16} color={colors.mutedForeground} style={styles.chevron} />
                    )}
                </View>
            </View>
        </Pressable>
    )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        row: {
            backgroundColor: colors.card,
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        rowFirst: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
        },
        rowLast: {
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
        },
        rowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        rowPressed: {
            backgroundColor: colors.muted,
        },
        rowDisabled: {
            opacity: 0.5,
        },
        rowContent: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        rowText: {
            flex: 1,
            marginRight: 8,
        },
        rowTitle: {
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            color: colors.foreground,
        },
        rowTitleDisabled: {
            color: colors.mutedForeground,
        },
        rowSubtitle: {
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
            color: colors.mutedForeground,
            marginTop: 2,
        },
        rowRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        chevron: {
            marginLeft: 2,
        },
    })
