export const isMissingEmbeddingModelColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false

  const code = typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code.toUpperCase()
    : ""

  const message = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : ""
  const detail = typeof (error as { detail?: unknown }).detail === "string"
    ? (error as { detail: string }).detail
    : ""
  const details = typeof (error as { details?: unknown }).details === "string"
    ? (error as { details: string }).details
    : ""
  const combined = `${message} ${detail} ${details}`.toLowerCase()

  // 42703 is PostgreSQL's undefined_column error. We still confirm the column
  // name in the message/details so unrelated missing-column errors do not get
  // treated as "missing embedding_model".
  return code === "42703" && combined.includes("embedding_model") && combined.includes("does not exist")
}
