import {
  readSettingsErrorMessage,
  SETTINGS_SERVICE_UNAVAILABLE_MESSAGE,
} from "@core/services/settingsErrorMessage"

describe("core/services/settingsErrorMessage", () => {
  it("returns a friendly message for service unavailable responses", async () => {
    const error = {
      context: new Response("Service Temporarily Unavailable", { status: 503 }),
    }

    await expect(
      readSettingsErrorMessage(error, "Failed to load settings")
    ).resolves.toBe(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
  })

  it("returns a friendly message for network-resolution failures", async () => {
    const error = new Error("name resolution failed")

    await expect(
      readSettingsErrorMessage(error, "Failed to load settings")
    ).resolves.toBe(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
  })

  it("keeps explicit payload messages when they are actionable", async () => {
    const error = {
      context: new Response(JSON.stringify({ error: "Gemini API key is required for initial setup" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    }

    await expect(
      readSettingsErrorMessage(error, "Failed to save settings")
    ).resolves.toBe("Gemini API key is required for initial setup")
  })

  it('uses fallback text for unknown errors and handles malformed contexts', async () => {
    await expect(readSettingsErrorMessage({}, 'fallback')).resolves.toBe('fallback')
    await expect(readSettingsErrorMessage({ context: { json: async () => ({}) } }, 'fallback')).resolves.toBe('fallback')
    await expect(readSettingsErrorMessage({ context: { json: async () => { throw new Error('bad json') } } }, 'fallback')).resolves.toBe('fallback')
    await expect(readSettingsErrorMessage(new Error('load failed'), 'fallback')).resolves.toBe(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
    await expect(readSettingsErrorMessage(new Error('explicit'), 'fallback')).resolves.toBe('explicit')
  })
})
