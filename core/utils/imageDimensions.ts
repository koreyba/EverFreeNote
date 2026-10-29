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
