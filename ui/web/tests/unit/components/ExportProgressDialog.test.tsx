import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { ExportProgressDialog } from "@/components/ExportProgressDialog"
import type { ExportProgress } from "@core/enex/export-types"

describe("ExportProgressDialog", () => {
  const defaultProgress: ExportProgress = {
    currentNote: 25,
    totalNotes: 100,
    currentStep: "fetching",
    message: "Processing notes...",
  }

  const defaultProps = {
    open: true,
    progress: defaultProgress,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render dialog content when open is false", () => {
    render(<ExportProgressDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("Export in progress")).toBeNull()
  })

  it("renders in-progress state with calculated percentage and note counters", () => {
    render(<ExportProgressDialog {...defaultProps} />)

    expect(screen.getByText("Export in progress")).toBeTruthy()
    expect(screen.getByText("Please keep this window open until export finishes.")).toBeTruthy()
    expect(screen.getByText("25 of 100")).toBeTruthy()
    expect(screen.getByText("25%")).toBeTruthy()
    const footerBtn = screen.queryAllByRole("button", { name: "Close" }).find((btn) => btn.className.includes("rounded-full"))
    expect(footerBtn).toBeUndefined()
  })

  it("calculates 0% when totalNotes is 0", () => {
    const zeroProgress: ExportProgress = {
      currentNote: 0,
      totalNotes: 0,
      currentStep: "fetching",
      message: "Preparing...",
    }

    render(<ExportProgressDialog {...defaultProps} progress={zeroProgress} />)

    expect(screen.getByText("0 of 0")).toBeTruthy()
    expect(screen.getByText("0%")).toBeTruthy()
  })

  it("renders completed state with Close button and triggers onClose on click", () => {
    const onCloseMock = jest.fn()
    const completeProgress: ExportProgress = {
      currentNote: 100,
      totalNotes: 100,
      currentStep: "complete",
      message: "Export finished successfully",
    }

    render(<ExportProgressDialog {...defaultProps} progress={completeProgress} onClose={onCloseMock} />)

    expect(screen.getByText("Export completed")).toBeTruthy()
    expect(screen.getByText("File is ready to download.")).toBeTruthy()
    expect(screen.getByText("100%")).toBeTruthy()

    const closeButton = screen.getAllByRole("button", { name: "Close" })[0]
    expect(closeButton).toBeTruthy()

    fireEvent.click(closeButton)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it("renders export completed with errors when message contains error details", () => {
    const errorProgress: ExportProgress = {
      currentNote: 80,
      totalNotes: 100,
      currentStep: "complete",
      message: "Export completed with 2 item errors",
    }

    render(<ExportProgressDialog {...defaultProps} progress={errorProgress} />)

    expect(screen.getByText("Export completed with errors")).toBeTruthy()
    expect(screen.getByText("File is ready to download.")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0)
  })
})
