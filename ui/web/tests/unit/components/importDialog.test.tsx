import { fireEvent, render, screen } from '@testing-library/react'

import { ImportDialog } from '@/components/ImportDialog'

const enexFile = () => new File(['<en-export />'], 'notes.enex', { type: 'application/xml' })

describe('ImportDialog', () => {
  it('filters selected files, edits settings, and imports them through the callback', () => {
    const onImport = jest.fn()
    const onOpenChange = jest.fn()
    render(<ImportDialog open onOpenChange={onOpenChange} onImport={onImport} />)

    const validFile = enexFile()
    const invalidFile = new File(['text'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Upload ENEX file'), {
      target: { files: [validFile, invalidFile] },
    })

    expect(screen.getByText('Selected files (1)')).toBeTruthy()
    expect(screen.getByText('notes.enex')).toBeTruthy()
    expect(screen.queryByText('notes.txt')).toBeNull()

    fireEvent.click(screen.getByLabelText('Skip duplicate notes'))
    fireEvent.click(screen.getByLabelText('Skip duplicates inside imported file(s)'))
    fireEvent.click(screen.getByRole('button', { name: 'Import (1)' }))

    expect(onImport).toHaveBeenCalledWith([validFile], {
      duplicateStrategy: 'skip',
      skipFileDuplicates: true,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText('notes.enex')).toBeNull()
  })

  it('handles drag and drop, removes a file, and ignores import with no files', () => {
    const onImport = jest.fn()
    const onOpenChange = jest.fn()
    render(<ImportDialog open onOpenChange={onOpenChange} onImport={onImport} />)

    const dropZone = screen.getByText('Drag & drop .enex files').parentElement
    expect(dropZone).toBeTruthy()
    fireEvent.dragOver(dropZone!)
    expect(screen.getByText('Drop files here')).toBeTruthy()

    const first = enexFile()
    const second = new File(['<en-export />'], 'other.ENEX', { type: 'application/xml' })
    const invalid = new File(['text'], 'readme.md', { type: 'text/markdown' })
    fireEvent.drop(dropZone!, { dataTransfer: { files: [first, second, invalid] } })

    expect(screen.getByText('Selected files (2)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove notes.enex' }))
    expect(screen.queryByText('notes.enex')).toBeNull()
    expect(screen.getByText('other.ENEX')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onImport).not.toHaveBeenCalled()
  })

  it('resets the skip-duplicates setting when opened again', () => {
    const onImport = jest.fn()
    const onOpenChange = jest.fn()
    const view = render(<ImportDialog open onOpenChange={onOpenChange} onImport={onImport} />)

    const checkbox = screen.getByLabelText('Skip duplicates inside imported file(s)')
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('data-state')).toBe('checked')

    view.rerender(<ImportDialog open={false} onOpenChange={onOpenChange} onImport={onImport} />)
    view.rerender(<ImportDialog open onOpenChange={onOpenChange} onImport={onImport} />)

    expect(screen.getByLabelText('Skip duplicates inside imported file(s)').getAttribute('data-state')).toBe('unchecked')
  })
})
