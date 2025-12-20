const isTestAuthEnabled = process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true'

export const featureFlags = {
    testAuth: isTestAuthEnabled,
}
