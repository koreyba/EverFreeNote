import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { DeleteAccountPanel } from "@/components/features/settings/DeleteAccountPanel"

describe("DeleteAccountPanel", () => {
  const defaultProps = {
    email: "user@example.com",
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders email, warning header, permanent action warning text, and checkbox label", () => {
    render(<DeleteAccountPanel {...defaultProps} />)

    expect(screen.getByText("user@example.com")).toBeTruthy()
    expect(screen.getByText("Permanent action")).toBeTruthy()
    expect(
      screen.getByText(
        "This will permanently delete your account and all notes. Export your notes before deleting the account if you need a copy."
      )
    ).toBeTruthy()
    expect(
      screen.getByText("I understand that my account and all notes will be permanently deleted.")
    ).toBeTruthy()
  })

  it("renders fallback text when email is missing or null", () => {
    render(<DeleteAccountPanel {...defaultProps} email={null} />)

    expect(screen.getByText("No email available")).toBeTruthy()
  })

  it("keeps the delete button disabled until the acknowledgment checkbox is checked", () => {
    render(<DeleteAccountPanel {...defaultProps} />)

    const deleteButton = screen.getByRole("button", { name: "Delete account" }) as HTMLButtonElement
    const checkbox = screen.getByRole("checkbox", {
      name: "I understand that my account and all notes will be permanently deleted.",
    })

    expect(deleteButton.disabled).toBe(true)

    fireEvent.click(checkbox)
    expect(deleteButton.disabled).toBe(false)

    fireEvent.click(checkbox)
    expect(deleteButton.disabled).toBe(true)
  })

  it("reflects external loading prop on delete button state and label", () => {
    const { rerender } = render(<DeleteAccountPanel {...defaultProps} loading={false} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    const deleteButton = screen.getByRole("button", { name: "Delete account" }) as HTMLButtonElement
    expect(deleteButton.disabled).toBe(false)

    rerender(<DeleteAccountPanel {...defaultProps} loading={true} />)

    const loadingButton = screen.getByRole("button", { name: "Deleting..." }) as HTMLButtonElement
    expect(loadingButton.disabled).toBe(true)
  })

  it("executes delete confirmation on button click and unchecks acknowledgment on success", async () => {
    let resolveDelete!: () => void
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const onConfirmMock = jest.fn().mockReturnValue(deletePromise)

    render(<DeleteAccountPanel {...defaultProps} onConfirm={onConfirmMock} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    const deleteButton = screen.getByRole("button", { name: "Delete account" })
    fireEvent.click(deleteButton)

    expect(onConfirmMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeTruthy()

    resolveDelete()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete account" })).toBeTruthy()
    })

    const buttonAfter = screen.getByRole("button", { name: "Delete account" }) as HTMLButtonElement
    expect(buttonAfter.disabled).toBe(true)
  })

  it("displays error message when onConfirm rejects with an Error object", async () => {
    const onConfirmMock = jest.fn().mockRejectedValue(new Error("Server error during account deletion"))

    render(<DeleteAccountPanel {...defaultProps} onConfirm={onConfirmMock} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))

    await waitFor(() => {
      expect(screen.getByText("Server error during account deletion")).toBeTruthy()
    })
  })

  it("displays fallback error message when onConfirm rejects with a non-Error value", async () => {
    const onConfirmMock = jest.fn().mockRejectedValue("unexpected error")

    render(<DeleteAccountPanel {...defaultProps} onConfirm={onConfirmMock} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))

    await waitFor(() => {
      expect(screen.getByText("Failed to delete account. Please try again.")).toBeTruthy()
    })
  })

  it("clears displayed error message when checkbox state changes", async () => {
    const onConfirmMock = jest.fn().mockRejectedValue(new Error("Temporary deletion error"))

    render(<DeleteAccountPanel {...defaultProps} onConfirm={onConfirmMock} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))

    await waitFor(() => {
      expect(screen.getByText("Temporary deletion error")).toBeTruthy()
    })

    // Unchecking checkbox clears error
    fireEvent.click(checkbox)
    expect(screen.queryByText("Temporary deletion error")).toBeNull()
  })
})
