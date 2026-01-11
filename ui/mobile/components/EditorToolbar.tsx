import React, { useMemo } from 'react'
import { ScrollView, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Minus,
    Quote,
    Code
} from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'

type Props = {
    onCommand: (method: string, args?: unknown[]) => void
}

export const EditorToolbar = ({ onCommand }: Props) => {
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()
    const styles = useMemo(() => createStyles(colors), [colors])

    const ToolbarButton = ({ icon: Icon, onPress }: { icon: React.ElementType, onPress: () => void }) => (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            onPress={onPress}
        >
            <Icon size={20} color={colors.foreground} />
        </Pressable>
    )

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ToolbarButton icon={Bold} onPress={() => onCommand('toggleBold')} />
                <ToolbarButton icon={Italic} onPress={() => onCommand('toggleItalic')} />
                <ToolbarButton icon={Underline} onPress={() => onCommand('toggleUnderline')} />
                <View style={styles.divider} />
                <ToolbarButton icon={Heading1} onPress={() => onCommand('toggleHeading', [{ level: 1 }])} />
                <ToolbarButton icon={Heading2} onPress={() => onCommand('toggleHeading', [{ level: 2 }])} />
                <ToolbarButton icon={Minus} onPress={() => onCommand('setHorizontalRule')} />
                <View style={styles.divider} />
                <ToolbarButton icon={List} onPress={() => onCommand('toggleBulletList')} />
                <ToolbarButton icon={ListOrdered} onPress={() => onCommand('toggleOrderedList')} />
                <View style={styles.divider} />
                <ToolbarButton icon={Quote} onPress={() => onCommand('toggleBlockquote')} />
                <ToolbarButton icon={Code} onPress={() => onCommand('toggleCodeBlock')} />
            </ScrollView>
        </View>
    )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    scrollContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
        height: 48,
    },
    button: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        borderRadius: 8,
    },
    buttonPressed: {
        backgroundColor: colors.accent,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
        marginHorizontal: 8,
    },
})
