import React, { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Trash2 } from 'lucide-react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    Easing,
} from 'react-native-reanimated'
import { useTheme, useSwipeContext } from '@ui/mobile/providers'
import { NoteCard } from './NoteCard'
import type { Note } from '@core/types/domain'

interface SwipeableNoteCardProps {
    note: Note & {
        snippet?: string | null
        headline?: string | null
    }
    onPress: () => void
    onTagPress?: (tag: string) => void
    onDelete: (id: string) => void
}

const ITEM_HEIGHT = 120 // Approximate height of NoteCard + margin

export function SwipeableNoteCard({ note, onPress, onTagPress, onDelete }: SwipeableNoteCardProps) {
    const { colors } = useTheme()
    const { register, unregister, onSwipeStart } = useSwipeContext()
    const swipeableRef = useRef<Swipeable>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    // Reanimated shared values
    const height = useSharedValue(ITEM_HEIGHT)
    const opacity = useSharedValue(1)

    useEffect(() => {
        if (swipeableRef.current) {
            register(note.id, swipeableRef.current)
        }
        return () => unregister(note.id)
    }, [note.id, register, unregister])

    const animatedContainerStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: opacity.value,
        overflow: 'hidden',
    }))

    const handleDelete = () => {
        setIsRemoving(true)
        swipeableRef.current?.close()

        // Animate collapse
        height.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.ease),
        })
        opacity.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.ease),
        }, () => {
            runOnJS(onDelete)(note.id)
        })
    }

    const renderRightActions = (
        _progress: import('react-native').Animated.AnimatedInterpolation<number>,
        dragX: import('react-native').Animated.AnimatedInterpolation<number>
    ) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        })

        return (
            <Pressable
                onPress={handleDelete}
                disabled={isRemoving}
                style={[styles.deleteAction, isRemoving && { opacity: 0.7 }]}
            >
                <RNAnimated.View style={[styles.deleteContent, { transform: [{ translateX: trans }] }]}>
                    <Trash2 color="#fff" size={24} />
                </RNAnimated.View>
            </Pressable>
        )
    }

    return (
        <Animated.View style={animatedContainerStyle}>
            <Swipeable
                key={note.id}
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                friction={2}
                rightThreshold={40}
                onSwipeableWillOpen={() => onSwipeStart(note.id)}
                enabled={!isRemoving}
            >
                <View style={{ backgroundColor: colors.background }}>
                    <NoteCard
                        note={note}
                        onPress={isRemoving ? () => { } : onPress}
                        onTagPress={isRemoving ? undefined : onTagPress}
                    />
                </View>
            </Swipeable>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    deleteAction: {
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        marginBottom: 12,
        borderRadius: 12,
    },
    deleteContent: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
})
