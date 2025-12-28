import React, { useRef, useEffect, memo, useCallback, useMemo } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Trash2 } from 'lucide-react-native'
import Reanimated, {
    useAnimatedStyle,
    type SharedValue,
} from 'react-native-reanimated'
import { useTheme, useSwipeContext } from '@ui/mobile/providers'
import { NoteCard } from './NoteCard'
import type { Note } from '@core/types/domain'

type ThemeColors = ReturnType<typeof useTheme>['colors']

interface SwipeableNoteCardProps {
    note: Note & {
        snippet?: string | null
        headline?: string | null
    }
    onPress: (note: Note) => void
    onTagPress?: (tag: string) => void
    onDelete: (id: string) => void
}

interface RightActionProps {
    drag: SharedValue<number>
    onDelete: () => void
    colors: ThemeColors
}

const RightAction = memo(function RightAction({ drag, onDelete, colors }: RightActionProps) {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: drag.value + 80 }],
    }))

    return (
        <Reanimated.View style={[styles.deleteAction, { backgroundColor: colors.destructive }, animatedStyle]}>
            <Pressable onPress={onDelete} style={styles.deleteContent}>
                <Trash2 color={colors.destructiveForeground} size={24} />
            </Pressable>
        </Reanimated.View>
    )
})

export const SwipeableNoteCard = memo(function SwipeableNoteCard({ note, onPress, onTagPress, onDelete }: SwipeableNoteCardProps) {
    const { colors } = useTheme()
    const { register, unregister, onSwipeStart } = useSwipeContext()
    const swipeableRef = useRef<SwipeableMethods>(null)

    useEffect(() => {
        if (swipeableRef.current) {
            register(note.id, swipeableRef.current)
        }
        return () => unregister(note.id)
    }, [note.id, register, unregister])

    const handleDelete = useCallback(() => {
        swipeableRef.current?.close()
        onDelete(note.id)
    }, [onDelete, note.id])

    const handlePress = useCallback(() => {
        onPress(note)
    }, [onPress, note])

    const handleSwipeStart = useCallback(() => {
        onSwipeStart(note.id)
    }, [onSwipeStart, note.id])

    const renderRightActions = useCallback(
        (_progress: SharedValue<number>, drag: SharedValue<number>) => (
            <RightAction drag={drag} onDelete={handleDelete} colors={colors} />
        ),
        [handleDelete, colors]
    )

    const containerStyle = useMemo(() => ({ backgroundColor: colors.background }), [colors.background])

    return (
        <ReanimatedSwipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={40}
            onSwipeableWillOpen={handleSwipeStart}
            overshootRight={false}
        >
            <View style={containerStyle}>
                <NoteCard
                    note={note}
                    onPress={handlePress}
                    onTagPress={onTagPress}
                />
            </View>
        </ReanimatedSwipeable>
    )
})

const styles = StyleSheet.create({
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        marginBottom: 12,
        borderRadius: 12,
    },
    deleteContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
})
