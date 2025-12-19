import { useState, useEffect } from 'react'
import { mobileNetworkStatusProvider } from '../adapters/networkStatus'

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(mobileNetworkStatusProvider.isOnline())

    useEffect(() => {
        const unsubscribe = mobileNetworkStatusProvider.subscribe((online) => {
            setIsOnline(online)
        })
        return unsubscribe
    }, [])

    return isOnline
}
