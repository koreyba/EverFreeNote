/**
 * Unit tests for SwipeProvider and useSwipeContext
 */
import React from 'react'
import { Text } from 'react-native'
import { render, renderHook, screen } from '@testing-library/react-native'
import { SwipeProvider, useSwipeContext } from '@ui/mobile/providers/SwipeProvider'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

// SwipeableMethods is only used as a type; no runtime mock needed.

/** Helper: create a fake SwipeableMethods ref */
function makeMockRef(): SwipeableMethods {
    return {
        close: jest.fn(),
        openLeft: jest.fn(),
        openRight: jest.fn(),
        reset: jest.fn(),
    } as unknown as SwipeableMethods
}

/** Convenience wrapper that renders children inside SwipeProvider */
function wrapper({ children }: { children: React.ReactNode }) {
    return <SwipeProvider>{children}</SwipeProvider>
}

describe('SwipeProvider', () => {
    it('renders children', () => {
        render(
            <SwipeProvider>
                <Text testID="child">Hello</Text>
            </SwipeProvider>,
        )
        expect(screen.getByTestId('child')).toBeTruthy()
    })
})

describe('useSwipeContext', () => {
    it('throws when used outside SwipeProvider', () => {
        // Suppress the error boundary console.error noise
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => useSwipeContext())
        }).toThrow('useSwipeContext must be used within a SwipeProvider')

        consoleSpy.mockRestore()
    })

    it('returns context functions when inside SwipeProvider', () => {
        const { result } = renderHook(() => useSwipeContext(), { wrapper })

        expect(typeof result.current.register).toBe('function')
        expect(typeof result.current.unregister).toBe('function')
        expect(typeof result.current.onSwipeStart).toBe('function')
        expect(typeof result.current.closeAll).toBe('function')
    })

    describe('register', () => {
        it('adds a swipeable ref to the map (verified via closeAll)', () => {
            const ref = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-1', ref)
            result.current.closeAll()

            expect(ref.close).toHaveBeenCalledTimes(1)
        })
    })

    describe('unregister', () => {
        it('removes a swipeable ref from the map', () => {
            const ref = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-1', ref)
            result.current.unregister('item-1')

            // After unregistering, closeAll should not call close on the removed ref
            result.current.closeAll()

            expect(ref.close).not.toHaveBeenCalled()
        })

        it('clears activeId when unregistering the active swipeable', () => {
            const refA = makeMockRef()
            const refB = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-a', refA)
            result.current.register('item-b', refB)

            // Make item-a active
            result.current.onSwipeStart('item-a')

            // Unregister the active item
            result.current.unregister('item-a')

            // Now start swiping item-b; since activeId was cleared, item-a.close
            // should NOT be called (it is already gone)
            result.current.onSwipeStart('item-b')

            expect(refA.close).not.toHaveBeenCalled()
        })
    })

    describe('closeAll', () => {
        it('calls close on all registered swipeables and clears activeId', () => {
            const refA = makeMockRef()
            const refB = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-a', refA)
            result.current.register('item-b', refB)
            result.current.onSwipeStart('item-a')

            result.current.closeAll()

            expect(refA.close).toHaveBeenCalledTimes(1)
            expect(refB.close).toHaveBeenCalledTimes(1)

            // After closeAll clears activeId, starting a new swipe on item-a
            // should NOT trigger a close on any existing ref (activeId is null)
            ;(refA.close as jest.Mock).mockClear()
            ;(refB.close as jest.Mock).mockClear()
            result.current.onSwipeStart('item-a')

            expect(refA.close).not.toHaveBeenCalled()
            expect(refB.close).not.toHaveBeenCalled()
        })
    })

    describe('onSwipeStart', () => {
        it('sets activeId to the swiped item', () => {
            const refA = makeMockRef()
            const refB = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-a', refA)
            result.current.register('item-b', refB)

            result.current.onSwipeStart('item-a')

            // Now swipe item-b: the previously active item-a should be closed
            result.current.onSwipeStart('item-b')

            expect(refA.close).toHaveBeenCalledTimes(1)
        })

        it('closes the previous active swipeable when a different one starts swiping', () => {
            const refA = makeMockRef()
            const refB = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-a', refA)
            result.current.register('item-b', refB)

            result.current.onSwipeStart('item-a')
            result.current.onSwipeStart('item-b')

            expect(refA.close).toHaveBeenCalledTimes(1)
            expect(refB.close).not.toHaveBeenCalled()
        })

        it('does nothing to activeId if the same id is swiped again', () => {
            const refA = makeMockRef()
            const { result } = renderHook(() => useSwipeContext(), { wrapper })

            result.current.register('item-a', refA)

            result.current.onSwipeStart('item-a')
            result.current.onSwipeStart('item-a')

            // close should never be called on itself
            expect(refA.close).not.toHaveBeenCalled()
        })
    })
})
