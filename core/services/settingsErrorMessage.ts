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

const readPayloadMessage = async (context: ResponseLike): Promise<string | null> => {
  if (typeof context.json !== "function") return null

  try {
    const payload = await context.json()
    if (!payload || typeof payload !== "object") return null

    const obj = payload as { message?: unknown; error?: unknown }
    if (typeof obj.message === "string") return obj.message
    if (typeof obj.error === "string") return obj.error
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
  if (typeof context.json !== "function") return null

  const payloadMessage = await readPayloadMessage(context)
  if (payloadMessage && !isNetworkFailureMessage(payloadMessage)) {
    return payloadMessage
  }
  if (typeof context.status === "number" && isServiceUnavailableStatus(context.status)) {
    return SETTINGS_SERVICE_UNAVAILABLE_MESSAGE
  }
  return payloadMessage
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
