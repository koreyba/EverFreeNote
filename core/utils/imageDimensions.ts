// Dimensions are HTML pixel integers, bounded to prevent pathological layouts.
export const MAX_IMAGE_DIMENSION = 16_384

export function isValidImageDimension(value: string | null | undefined): value is string {
  if (!value || value.length > 16 || !/^\d+$/.test(value)) return false
  const pixels = Number(value)
  return Number.isSafeInteger(pixels) && pixels > 0 && pixels <= MAX_IMAGE_DIMENSION
}

export function imageAspectRatio(width: string | null | undefined, height: string | null | undefined): string | null {
  return isValidImageDimension(width) && isValidImageDimension(height) ? `${width} / ${height}` : null
}

/** The width that gives a height-only image its requested height at its natural aspect ratio. */
export function imageWidthForHeight(height: string | null | undefined, naturalWidth: number, naturalHeight: number): string | null {
  if (!isValidImageDimension(height) || !Number.isSafeInteger(naturalWidth) || !Number.isSafeInteger(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) return null
  // CSS accepts decimal pixel values, including values smaller than one pixel.
  // Clamp impractical widths so formatting never switches to exponential notation.
  const width = Math.max(0.000001, Math.min(Number(height) * naturalWidth / naturalHeight, 16_777_216))
  return `${width.toFixed(6)}px`
}
