/** @jest-environment jsdom */

import { ImageProcessor } from "@core/enex/image-processor"

const createStorage = () => {
  const upload = jest.fn().mockResolvedValue({ error: null })
  const getPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: "https://storage.test/image" } })
  const from = jest.fn().mockReturnValue({ upload, getPublicUrl })
  return { upload, getPublicUrl, from }
}

describe("ImageProcessor additional branches", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("uploads a valid data URI with the exact storage path, blob, and options", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000123)
    const storage = createStorage()
    const processor = new ImageProcessor({ storage: { from: storage.from } } as never)

    await expect(processor.upload("data:image/webp;base64,AQID", "image/webp", "user-1", "note-1", "photo"))
      .resolves.toBe("https://storage.test/image")

    const path = "user-1/note-1/1700000000123_photo.webp"
    const blob = storage.upload.mock.calls[0][1] as Blob
    expect(storage.from).toHaveBeenNthCalledWith(1, "note-images")
    expect(storage.from).toHaveBeenNthCalledWith(2, "note-images")
    expect(blob).toEqual(expect.any(Blob))
    expect(blob.type).toBe("image/webp")
    expect(blob.size).toBe(3)
    expect(storage.upload).toHaveBeenCalledWith(path, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    })
    expect(storage.getPublicUrl).toHaveBeenCalledWith(path)
  })

  it("accepts an empty data URI and falls back to png for a MIME without an extension", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000999)
    const storage = createStorage()
    const processor = new ImageProcessor({ storage: { from: storage.from } } as never)

    await expect(processor.upload("data:image/png;base64,", "", "user", "note", "empty.file"))
      .resolves.toBe("https://storage.test/image")

    const blob = storage.upload.mock.calls[0][1] as Blob
    expect(blob.size).toBe(0)
    expect(blob.type).toBe("")
    expect(storage.upload).toHaveBeenCalledWith("user/note/1700000000999_empty.file.png", blob, {
      contentType: "",
      cacheControl: "3600",
      upsert: false,
    })
  })

  it("uses the MIME suffix literally when building a filename extension", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000555)
    const storage = createStorage()
    const processor = new ImageProcessor({ storage: { from: storage.from } } as never)

    await processor.upload("PHN2Zw==", "image/svg+xml", "u", "n", "diagram.final")

    expect(storage.upload.mock.calls[0][0]).toBe("u/n/1700000000555_diagram.final.svg+xml")
  })

  it("wraps invalid data URIs and Error-shaped storage failures", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    const storage = createStorage()
    const processor = new ImageProcessor({ storage: { from: storage.from } } as never)

    await expect(processor.upload("data:image/png;base64,not valid base64!", "image/png", "u", "n", "broken"))
      .rejects.toThrow(/^Failed to upload image:/)
    expect(storage.upload).not.toHaveBeenCalled()

    storage.upload.mockRejectedValueOnce(new Error("storage connection lost"))
    await expect(processor.upload("AQ==", "image/png", "u", "n", "network"))
      .rejects.toThrow("Failed to upload image: storage connection lost")
    expect(consoleError).toHaveBeenCalled()
  })

  it("reports storage upload and public URL failures with stable messages", async () => {
    const storage = createStorage()
    const processor = new ImageProcessor({ storage: { from: storage.from } } as never)

    storage.upload.mockResolvedValueOnce({ error: { message: "storage rejected" } })
    await expect(processor.upload("AQ==", "image/png", "u", "n", "denied"))
      .rejects.toThrow("Failed to upload image: storage rejected")

    storage.getPublicUrl.mockReturnValueOnce({ data: undefined })
    await expect(processor.upload("AQ==", "image/png", "u", "n", "missing-url"))
      .rejects.toThrow("Failed to upload image: Failed to get public URL")
  })
})
