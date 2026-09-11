import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Hand a generated file to the user from inside the shell.
 *
 * An `<a download>` click — how the web app saves an export — does nothing in an
 * Android WebView: no file, no error, no prompt. The file is written to the app's
 * cache instead and offered through the system share sheet, which is what the retired
 * React Native app did with expo-file-system + expo-sharing.
 */
export async function saveAndShareFile(blob: Blob, fileName: string, title: string): Promise<void> {
  const data = await toBase64(blob)

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data,
    // Cache, not Documents: the file only needs to survive until the share sheet
    // reads it, and cache needs no storage permission.
    directory: Directory.Cache,
  })

  await Share.share({ title, files: [uri] })
}

/**
 * FileReader gives a data: URL; Filesystem.writeFile wants the payload without the
 * `data:<mime>;base64,` prefix.
 */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the generated file'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const separator = result.indexOf(',')
      resolve(separator === -1 ? result : result.slice(separator + 1))
    }
    reader.readAsDataURL(blob)
  })
}
