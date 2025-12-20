const isTestAuthEnabled = process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true';

console.log('[FeatureFlags] EXPO_PUBLIC_ENABLE_TEST_AUTH:', process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH);
console.log('[FeatureFlags] Final testAuth status:', isTestAuthEnabled);

export const featureFlags = {
    testAuth: isTestAuthEnabled,
}
