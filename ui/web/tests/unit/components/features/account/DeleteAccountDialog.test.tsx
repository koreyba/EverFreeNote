import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { DeleteAccountDialog } from "@/components/features/account/DeleteAccountDialog"

describe("DeleteAccountDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render dialog content when open is false", () => {
    render(<DeleteAccountDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("Delete my account")).toBeNull()
  })

  it("renders dialog title, description, tip message, checkbox label, and buttons when open is true", () => {
    render(<DeleteAccountDialog {...defaultProps} />)

    expect(screen.getByRole("heading", { name: "Delete my account" })).toBeTruthy()
    expect(
      screen.getByText(
        "This will permanently delete your account and all notes. Please export your notes before deleting if you need a copy."
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        "Tip: use the Export option in the settings menu to download your notes before deleting your account."
      )
    ).toBeTruthy()
    expect(
      screen.getByText("I understand that my account and all notes will be permanently deleted.")
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete account" })).toBeTruthy()
  })

  it("disables delete account button until acknowledgment checkbox is checked", () => {
    render(<DeleteAccountDialog {...defaultProps} />)

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

  it("handles cancel button click and calls onOpenChange(false)", () => {
    const onOpenChangeMock = jest.fn()

    render(<DeleteAccountDialog {...defaultProps} onOpenChange={onOpenChangeMock} />)

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(cancelButton)

    expect(onOpenChangeMock).toHaveBeenCalledWith(false)
  })

  it("executes onConfirm when enabled delete account button is clicked", async () => {
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((resolve) => {
      resolveConfirm = resolve
    })
    const onConfirmMock = jest.fn().mockReturnValue(confirmPromise)

    render(<DeleteAccountDialog {...defaultProps} onConfirm={onConfirmMock} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)

    const deleteButton = screen.getByRole("button", { name: "Delete account" })
    fireEvent.click(deleteButton)

    expect(onConfirmMock).toHaveBeenCalledTimes(1)

    resolveConfirm()

    await waitFor(() => {
      const buttonAfter = screen.getByRole("button", { name: "Delete account" }) as HTMLButtonElement
      expect(buttonAfter.disabled).toBe(true)
    })
  })

  it("disables cancel and action buttons and updates action text when loading is true", () => {
    render(<DeleteAccountDialog {...defaultProps} loading={true} />)

    const cancelButton = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement
    const deletingButton = screen.getByRole("button", { name: "Deleting..." }) as HTMLButtonElement

    expect(cancelButton.disabled).toBe(true)
    expect(deletingButton.disabled).toBe(true)
  })
})
