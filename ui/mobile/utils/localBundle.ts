import { Platform } from 'react-native'

/**
 * Check if the local web editor bundle should be available
 * Note: For Android, we can't directly check asset existence at runtime,
 * so we assume it exists if the build process included it.
 * For iOS, we similarly assume it's bundled if included in the app.
 * 
 * @returns boolean - True if bundle should be available
 */
export function shouldLocalBundleExist(): boolean {
  // Local bundle should exist for both platforms when included in the build.
  return Platform.OS === 'android' || Platform.OS === 'ios'
}

/**
 * Get the local bundle URL for the current platform
 * 
 * @returns string | null - Local bundle URL or null if not available
 */
export function getLocalBundleUrl(): string | null {
  if (!shouldLocalBundleExist()) {
    return null
  }
  
  if (Platform.OS === 'android') {
    // Android: Use android_asset protocol
    return 'file:///android_asset/web-editor/index.html'
    
  } else if (Platform.OS === 'ios') {
    // iOS: Use app bundle directory path
    // WebView will resolve this correctly
    return 'WebEditor/index.html'
  }
  
  return null
}
