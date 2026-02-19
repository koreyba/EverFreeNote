const appVariant = (process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? 'dev').trim().toLowerCase()
const isProdVariant = appVariant === 'prod' || appVariant === 'production'

const isTestAuthEnabled = !isProdVariant && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true'

export const featureFlags = {
    testAuth: isTestAuthEnabled,
}
