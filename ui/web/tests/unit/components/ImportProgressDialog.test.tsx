import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ImportProgressDialog } from "@ui/web/components/ImportProgressDialog"
import type { ImportProgress, ImportResult } from "@core/enex/types"

describe("ImportProgressDialog", () => {
  const defaultProgress: ImportProgress = {
    currentFile: 1,
    totalFiles: 1,
    currentNote: 5,
    totalNotes: 10,
    fileName: "export.enex",
  }

  const defaultProps = {
    open: true,
    progress: defaultProgress,
    result: null,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Modal Open & Closed States", () => {
    it("renders nothing when open prop is false", () => {
      render(<ImportProgressDialog {...defaultProps} open={false} />)
      expect(screen.queryByText("Importing ENEX file")).toBeNull()
    })

    it("renders in-progress dialog when open is true and result is null", () => {
      render(<ImportProgressDialog {...defaultProps} open={true} result={null} />)

      const titleHeading = screen.getByRole("heading", { level: 2 })
      expect(titleHeading.textContent).toContain("Importing ENEX file")
      expect(screen.getByText("Please wait while we import your notes...")).toBeTruthy()
    })
  })

  describe("Progress calculations & File display", () => {
    it("calculates note progress percentage correctly", () => {
      render(
        <ImportProgressDialog
          {...defaultProps}
          progress={{
            currentFile: 1,
            totalFiles: 1,
            currentNote: 7,
            totalNotes: 10,
            fileName: "archive.enex",
          }}
        />
      )

      expect(screen.getByText("7 of 10")).toBeTruthy()
      expect(screen.getByText("70%")).toBeTruthy()
      expect(screen.getByText("archive.enex")).toBeTruthy()
    })

    it("renders file progress when totalFiles is greater than 1", () => {
      render(
        <ImportProgressDialog
          {...defaultProps}
          progress={{
            currentFile: 2,
            totalFiles: 5,
            currentNote: 3,
            totalNotes: 10,
            fileName: "batch2.enex",
          }}
        />
      )

      expect(screen.getByText("2 of 5")).toBeTruthy()
      expect(screen.getByText("Files")).toBeTruthy()
    })

    it("hides file progress section when totalFiles is 1 or less", () => {
      render(
        <ImportProgressDialog
          {...defaultProps}
          progress={{
            currentFile: 1,
            totalFiles: 1,
            currentNote: 1,
            totalNotes: 5,
            fileName: "single.enex",
          }}
        />
      )

      expect(screen.queryByText("Files")).toBeNull()
    })

    it("handles zero totalNotes without crashing or dividing by zero", () => {
      render(
        <ImportProgressDialog
          {...defaultProps}
          progress={{
            currentFile: 1,
            totalFiles: 1,
            currentNote: 0,
            totalNotes: 0,
            fileName: "empty.enex",
          }}
        />
      )

      expect(screen.getByText("0%")).toBeTruthy()
      expect(screen.getByText("0 of 0")).toBeTruthy()
    })
  })

  describe("Import Complete state & Error messages", () => {
    it("renders successful import summary with checkmark icon", () => {
      const result: ImportResult = {
        success: 12,
        errors: 0,
        failedNotes: [],
        message: "Successfully imported 12 notes.",
      }

      render(<ImportProgressDialog {...defaultProps} result={result} />)

      const titleHeading = screen.getByRole("heading", { level: 2 })
      expect(titleHeading.textContent).toContain("Import Complete")
      expect(screen.getByText("Your import has finished.")).toBeTruthy()
      expect(screen.getByText("12")).toBeTruthy()
      expect(screen.getByText("Successful")).toBeTruthy()
      expect(screen.getByText("Successfully imported 12 notes.")).toBeTruthy()
    })

    it("renders failure icon when success is 0 and errors > 0", () => {
      const result: ImportResult = {
        success: 0,
        errors: 3,
        failedNotes: [
          { title: "Bad Note 1", error: "Invalid XML" },
          { title: "Bad Note 2", error: "Unsupported attachment" },
        ],
        message: "Import failed for all notes.",
      }

      render(<ImportProgressDialog {...defaultProps} result={result} />)

      expect(screen.getByText("0")).toBeTruthy()
      expect(screen.getByText("3")).toBeTruthy()
      expect(screen.getByText("Failed")).toBeTruthy()
      expect(screen.getByText("View failed notes (2)")).toBeTruthy()
      expect(screen.getByText("Bad Note 1")).toBeTruthy()
      expect(screen.getByText("Invalid XML")).toBeTruthy()
    })
  })

  describe("Close Button behavior", () => {
    it("renders Close button when import is complete and calls onClose on click", () => {
      const onClose = jest.fn()
      const result: ImportResult = {
        success: 5,
        errors: 0,
        failedNotes: [],
        message: "Done",
      }

      render(<ImportProgressDialog {...defaultProps} result={result} onClose={onClose} />)

      const closeButtons = screen.getAllByRole("button", { name: "Close" })
      const footerBtn = closeButtons.find(btn => !btn.querySelector("svg"))!
      expect(footerBtn).toBeTruthy()

      fireEvent.click(footerBtn)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("does not render footer Close button during in-progress import", () => {
      render(<ImportProgressDialog {...defaultProps} result={null} />)

      const closeButtons = screen.getAllByRole("button", { name: "Close" })
      const footerBtn = closeButtons.find(btn => !btn.querySelector("svg"))
      expect(footerBtn).toBeUndefined()
    })
  })
})
