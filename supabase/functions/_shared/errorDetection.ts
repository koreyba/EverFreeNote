export const isMissingEmbeddingModelColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false

  const code = typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code.toUpperCase()
    : ""

  if (code === "42703") return true

  const message = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : ""
  const details = typeof (error as { details?: unknown }).details === "string"
    ? (error as { details: string }).details
    : ""
  const combined = `${message} ${details}`.toLowerCase()

  return combined.includes("embedding_model") && combined.includes("does not exist")
}
