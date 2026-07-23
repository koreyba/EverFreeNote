import { webNetworkStatus } from '@ui/web/adapters/networkStatus'

describe('webNetworkStatus', () => {
  describe('in browser environment', () => {
    let addEventListenerSpy: jest.SpyInstance
    let removeEventListenerSpy: jest.SpyInstance

    beforeEach(() => {
      addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    describe('isOnline', () => {
      it('returns true when navigator.onLine is true', () => {
        jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
        expect(webNetworkStatus.isOnline()).toBe(true)
      })

      it('returns false when navigator.onLine is false', () => {
        jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
        expect(webNetworkStatus.isOnline()).toBe(false)
      })
    })

    describe('subscribe', () => {
      it('adds event listeners for online and offline events', () => {
        const callback = jest.fn()
        const unsubscribe = webNetworkStatus.subscribe(callback)

        expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
        expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

        unsubscribe()
      })

      it('calls callback(true) when window dispatches online event', () => {
        const callback = jest.fn()
        const unsubscribe = webNetworkStatus.subscribe(callback)

        window.dispatchEvent(new Event('online'))

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith(true)

        unsubscribe()
      })

      it('calls callback(false) when window dispatches offline event', () => {
        const callback = jest.fn()
        const unsubscribe = webNetworkStatus.subscribe(callback)

        window.dispatchEvent(new Event('offline'))

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith(false)

        unsubscribe()
      })

      it('removes event listeners when unsubscribe function is called', () => {
        const callback = jest.fn()
        const unsubscribe = webNetworkStatus.subscribe(callback)

        unsubscribe()

        expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
        expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

        // Dispatching events after unsubscribe should not invoke callback
        window.dispatchEvent(new Event('online'))
        window.dispatchEvent(new Event('offline'))

        expect(callback).not.toHaveBeenCalled()
      })

      it('supports multiple independent subscribers', () => {
        const callback1 = jest.fn()
        const callback2 = jest.fn()

        const unsubscribe1 = webNetworkStatus.subscribe(callback1)
        const unsubscribe2 = webNetworkStatus.subscribe(callback2)

        window.dispatchEvent(new Event('offline'))

        expect(callback1).toHaveBeenCalledWith(false)
        expect(callback2).toHaveBeenCalledWith(false)

        // Unsubscribe only callback1
        unsubscribe1()

        window.dispatchEvent(new Event('online'))

        expect(callback1).toHaveBeenCalledTimes(1)
        expect(callback2).toHaveBeenCalledTimes(2)
        expect(callback2).toHaveBeenLastCalledWith(true)

        unsubscribe2()
      })

      it('handles multiple unsubscribe calls safely', () => {
        const callback = jest.fn()
        const unsubscribe = webNetworkStatus.subscribe(callback)

        expect(() => {
          unsubscribe()
          unsubscribe()
        }).not.toThrow()
      })
    })
  })
})
