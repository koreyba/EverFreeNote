import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react'
import { Swipeable } from 'react-native-gesture-handler'

interface SwipeContextValue {
    register: (id: string, ref: Swipeable) => void
    unregister: (id: string) => void
    onSwipeStart: (id: string) => void
    closeAll: () => void
}

const SwipeContext = createContext<SwipeContextValue | null>(null)

export function SwipeProvider({ children }: { children: ReactNode }) {
    const swipeables = useRef<Map<string, Swipeable>>(new Map())
    const activeId = useRef<string | null>(null)

    const register = useCallback((id: string, ref: Swipeable) => {
        swipeables.current.set(id, ref)
    }, [])

    const unregister = useCallback((id: string) => {
        swipeables.current.delete(id)
        if (activeId.current === id) {
            activeId.current = null
        }
    }, [])

    const closeAll = useCallback(() => {
        swipeables.current.forEach((ref) => {
            ref.close()
        })
        activeId.current = null
    }, [])

    const onSwipeStart = useCallback((id: string) => {
        if (activeId.current && activeId.current !== id) {
            const activeRef = swipeables.current.get(activeId.current)
            activeRef?.close()
        }
        activeId.current = id
    }, [])

    return (
        <SwipeContext.Provider value={{ register, unregister, onSwipeStart, closeAll }}>
            {children}
        </SwipeContext.Provider>
    )
}

export function useSwipeContext() {
    const context = useContext(SwipeContext)
    if (!context) {
        throw new Error('useSwipeContext must be used within a SwipeProvider')
    }
    return context
}
