import { act, renderHook } from '@testing-library/react'
import { reducer, toast, useToast } from '@ui/web/hooks/use-toast'

describe('use-toast', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    // Clear any lingering toasts and pending timers
    act(() => {
      toast({ title: 'Cleanup' }).dismiss()
      jest.runAllTimers()
    })
    jest.useRealTimers()
  })

  describe('reducer', () => {
    it('handles ADD_TOAST and respects TOAST_LIMIT of 1', () => {
      const initialState = { toasts: [] }
      const toast1 = { id: '1', title: 'First Toast' }
      const toast2 = { id: '2', title: 'Second Toast' }

      const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 })
      expect(state1.toasts).toEqual([toast1])

      const state2 = reducer(state1, { type: 'ADD_TOAST', toast: toast2 })
      expect(state2.toasts).toEqual([toast2])
    })

    it('handles UPDATE_TOAST for existing and non-existing toasts', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Original Title', description: 'Original Desc' },
        ],
      }

      // Update matching toast
      const updatedState = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Title' },
      })
      expect(updatedState.toasts).toEqual([
        { id: '1', title: 'Updated Title', description: 'Original Desc' },
      ])

      // Update non-matching toast ID
      const noChangeState = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Non-existent' },
      })
      expect(noChangeState.toasts).toEqual(initialState.toasts)
    })

    it('handles DISMISS_TOAST with specific toastId', () => {
      const initialState = {
        toasts: [{ id: '1', title: 'Toast 1', open: true }],
      }

      const state = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      })

      expect(state.toasts[0].open).toBe(false)
    })

    it('handles DISMISS_TOAST without toastId (dismiss all)', () => {
      const initialState = {
        toasts: [{ id: '1', title: 'Toast 1', open: true }],
      }

      const state = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: undefined,
      })

      expect(state.toasts.every((t) => t.open === false)).toBe(true)
    })

    it('handles REMOVE_TOAST with specific toastId', () => {
      const initialState = {
        toasts: [{ id: '1', title: 'Toast 1' }],
      }

      const state = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      })

      expect(state.toasts).toEqual([])
    })

    it('handles REMOVE_TOAST without toastId (remove all)', () => {
      const initialState = {
        toasts: [{ id: '1', title: 'Toast 1' }],
      }

      const state = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      })

      expect(state.toasts).toEqual([])
    })
  })

  describe('toast helper function', () => {
    it('creates a toast, returns controls, and sets open: true', () => {
      const { result } = renderHook(() => useToast())

      let toastRef: ReturnType<typeof toast> | undefined
      act(() => {
        toastRef = toast({
          title: 'New Toast',
          description: 'Toast Description',
        })
      })

      expect(toastRef).toBeDefined()
      expect(toastRef?.id).toBeDefined()
      expect(result.current.toasts.length).toBe(1)
      expect(result.current.toasts[0]).toMatchObject({
        id: toastRef?.id,
        title: 'New Toast',
        description: 'Toast Description',
        open: true,
      })
    })

    it('allows updating toast content via the returned update function', () => {
      const { result } = renderHook(() => useToast())

      let toastRef: ReturnType<typeof toast> | undefined
      act(() => {
        toastRef = toast({ title: 'Initial Title' })
      })

      act(() => {
        toastRef?.update({ id: toastRef.id, title: 'Updated Title' })
      })

      expect(result.current.toasts[0].title).toBe('Updated Title')
    })

    it('allows dismissing toast via the returned dismiss function', () => {
      const { result } = renderHook(() => useToast())

      let toastRef: ReturnType<typeof toast> | undefined
      act(() => {
        toastRef = toast({ title: 'To Be Dismissed' })
      })

      expect(result.current.toasts[0].open).toBe(true)

      act(() => {
        toastRef?.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('triggers dismiss when onOpenChange is called with false', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'OpenChange Toast' })
      })

      const currentToast = result.current.toasts[0]
      expect(currentToast.open).toBe(true)

      act(() => {
        currentToast.onOpenChange?.(false)
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('does not trigger dismiss when onOpenChange is called with true', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'OpenChange Toast' })
      })

      const currentToast = result.current.toasts[0]

      act(() => {
        currentToast.onOpenChange?.(true)
      })

      expect(result.current.toasts[0].open).toBe(true)
    })
  })

  describe('useToast hook', () => {
    it('provides toast state and helper methods', () => {
      const { result } = renderHook(() => useToast())

      expect(result.current.toasts).toBeDefined()
      expect(typeof result.current.toast).toBe('function')
      expect(typeof result.current.dismiss).toBe('function')
    })

    it('dismisses a specific toast using hook dismiss(id)', () => {
      const { result } = renderHook(() => useToast())

      let createdId: string | undefined
      act(() => {
        const t = result.current.toast({ title: 'Toast 1' })
        createdId = t.id
      })

      expect(result.current.toasts[0].open).toBe(true)

      act(() => {
        result.current.dismiss(createdId)
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('dismisses all toasts when hook dismiss() is called without id', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.toast({ title: 'Toast 1' })
      })

      expect(result.current.toasts[0].open).toBe(true)

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('removes toast from state after TOAST_REMOVE_DELAY (1000000ms)', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.toast({ title: 'Temporary Toast' })
      })

      expect(result.current.toasts.length).toBe(1)

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
      expect(result.current.toasts.length).toBe(1)

      // Fast-forward removal delay
      act(() => {
        jest.advanceTimersByTime(1000000)
      })

      expect(result.current.toasts.length).toBe(0)
    })

    it('prevents duplicate removal timers when dismiss is called twice', () => {
      const { result } = renderHook(() => useToast())

      let createdId: string | undefined
      act(() => {
        const t = result.current.toast({ title: 'Double Dismiss' })
        createdId = t.id
      })

      act(() => {
        result.current.dismiss(createdId)
        result.current.dismiss(createdId)
      })

      expect(result.current.toasts[0].open).toBe(false)

      act(() => {
        jest.advanceTimersByTime(1000000)
      })

      expect(result.current.toasts.length).toBe(0)
    })

    it('subscribes and unsubscribes listeners cleanly on mount and unmount', () => {
      const hook1 = renderHook(() => useToast())
      const hook2 = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Shared Toast' })
      })

      expect(hook1.result.current.toasts.length).toBe(1)
      expect(hook2.result.current.toasts.length).toBe(1)

      // Unmount hook1
      hook1.unmount()

      act(() => {
        toast({ title: 'New Toast' })
      })

      // hook2 receives update, hook1 is unmounted
      expect(hook2.result.current.toasts[0].title).toBe('New Toast')
    })
  })
})
