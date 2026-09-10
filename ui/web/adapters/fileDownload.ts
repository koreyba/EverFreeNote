import { isNativeShell } from '@ui/shell/runtime/platform'

/**
 * Deliver a generated file to the user.
 *
 * In a browser this is an `<a download>` click. Inside the Android shell that silently
 * does nothing, so the shell writes the file and opens the system share sheet instead —
 * loaded dynamically so the plugins stay out of the web bundle's main chunk.
 */
export async function downloadGeneratedFile(blob: Blob, fileName: string, title: string): Promise<void> {
  if (isNativeShell()) {
    const { saveAndShareFile } = await import('@ui/shell/runtime/fileExport')
    await saveAndShareFile(blob, fileName, title)
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Откладываем освобождение URL, чтобы дать браузеру время на скачивание
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
