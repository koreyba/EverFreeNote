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
})
