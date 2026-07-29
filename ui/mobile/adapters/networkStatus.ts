import NetInfo from '@react-native-community/netinfo'
import type { NetworkStatusProvider } from '@core/types/offline'

export class MobileNetworkStatusProvider implements NetworkStatusProvider {
    private online: boolean = true

    initialize() {
        void NetInfo.fetch()
            .then(state => {
                this.online = !!state.isConnected
            })
            .catch(() => {
                // Keep the optimistic default when the initial status cannot be fetched.
            })
    }

    isOnline() {
        return this.online
    }

    subscribe(callback: (online: boolean) => void) {
        const unsubscribe = NetInfo.addEventListener(state => {
            this.online = !!state.isConnected
            callback(this.online)
        })
        return unsubscribe
    }
}

export const mobileNetworkStatusProvider = new MobileNetworkStatusProvider()
mobileNetworkStatusProvider.initialize()
