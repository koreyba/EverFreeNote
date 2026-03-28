const SETTINGS_SERVICE_UNAVAILABLE_MESSAGE =
  "Settings service is unavailable. Make sure the local Supabase services are running, then try again."

const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "network request failed",
  "name resolution failed",
  "fetch failed",
  "load failed",
] as const

const readPayloadMessage = async (context: Response): Promise<string | null> => {
  if (typeof context.json !== "function") return null

  try {
    const payload = await context.json()
    if (!payload || typeof payload !== "object") return null

    const message =
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : null

    return message
  } catch {
    return null
  }
}

const isServiceUnavailableStatus = (status: number): boolean => status === 502 || status === 503 || status === 504

const isNetworkFailureMessage = (message: string): boolean => {
  const normalized = message.toLowerCase()
  return NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export async function readSettingsErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (typeof error === "object" && error && "context" in error) {
    const context = (error as { context?: Response }).context
    if (context instanceof Response) {
      const payloadMessage = await readPayloadMessage(context)
      if (payloadMessage && !isNetworkFailureMessage(payloadMessage)) {
        return payloadMessage
      }
      if (isServiceUnavailableStatus(context.status)) {
        return SETTINGS_SERVICE_UNAVAILABLE_MESSAGE
      }
      if (payloadMessage) return payloadMessage
    }
  }

  if (error instanceof Error && error.message) {
    if (isNetworkFailureMessage(error.message)) {
      return SETTINGS_SERVICE_UNAVAILABLE_MESSAGE
    }
    return error.message
  }

  return fallback
}

export { SETTINGS_SERVICE_UNAVAILABLE_MESSAGE }
