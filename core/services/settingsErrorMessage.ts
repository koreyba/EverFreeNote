const SETTINGS_SERVICE_UNAVAILABLE_MESSAGE =
  "Settings service is unavailable. Make sure the local Supabase services are running, then try again."

const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "network request failed",
  "name resolution failed",
  "fetch failed",
  "load failed",
] as const

type ResponseLike = {
  json?: () => Promise<unknown>
  status?: unknown
}

export const readJsonErrorMessage = async (
  context: ResponseLike,
  fields: string[] = ["message", "msg", "error"]
): Promise<string | null> => {
  if (typeof context?.json !== "function") return null

  try {
    const payload = await context.json()
    if (!payload || typeof payload !== "object") return null

    const obj = payload as Record<string, unknown>
    for (const field of fields) {
      const val = obj[field]
      if (typeof val === "string" && val.trim()) {
        return val
      }
    }
    return null
  } catch {
    return null
  }
}

const isServiceUnavailableStatus = (status: number): boolean => status === 502 || status === 503 || status === 504

const isNetworkFailureMessage = (message: string): boolean => {
  const normalized = message.toLowerCase()
  return NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

const readContextErrorMessage = async (context: ResponseLike): Promise<string | null> => {
  const payloadMessage = await readJsonErrorMessage(context)
  if (payloadMessage) {
    if (isNetworkFailureMessage(payloadMessage)) {
      return SETTINGS_SERVICE_UNAVAILABLE_MESSAGE
    }
    return payloadMessage
  }
  if (typeof context.status === "number" && isServiceUnavailableStatus(context.status)) {
    return SETTINGS_SERVICE_UNAVAILABLE_MESSAGE
  }
  return null
}

export async function readSettingsErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (typeof error === "object" && error && "context" in error) {
    const context = (error as { context?: ResponseLike }).context
    if (context) {
      const contextMessage = await readContextErrorMessage(context)
      if (contextMessage) return contextMessage
    }
  }

  if (error instanceof Error && error.message) {
    return isNetworkFailureMessage(error.message) ? SETTINGS_SERVICE_UNAVAILABLE_MESSAGE : error.message
  }

  return fallback
}

export { SETTINGS_SERVICE_UNAVAILABLE_MESSAGE }
