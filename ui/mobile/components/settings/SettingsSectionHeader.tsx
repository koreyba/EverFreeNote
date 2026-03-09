import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@ui/mobile/providers'

interface SettingsSectionHeaderProps {
    title: string
}

export function SettingsSectionHeader({ title }: SettingsSectionHeaderProps) {
    const { colors } = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])

    return (
        <View style={styles.container}>
            <Text style={styles.text}>{title.toUpperCase()}</Text>
        </View>
    )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: 8,
        },
        text: {
            fontSize: 11,
            fontFamily: 'Inter_600SemiBold',
            color: colors.mutedForeground,
            letterSpacing: 0.8,
        },
    })
