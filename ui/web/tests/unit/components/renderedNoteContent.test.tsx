import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { RenderedNoteContent } from '@/components/RenderedNoteContent'
import { SanitizationService } from '@core/services/sanitizer'

describe('RenderedNoteContent', () => {
  it('uses loaded intrinsic proportions without changing note data or provided styles', () => {
    const source = '<p><img src="/wide.png" height="48" alt="Wide"><img src="/styled.png" height="48" style="width: 20px" alt="Styled"></p>'
    const html = SanitizationService.sanitizeForReading(source)
    const ref = React.createRef<HTMLDivElement>()
    const { getByAltText, rerender } = render(<RenderedNoteContent ref={ref} className="note-content" html={html} />)
    const wide = getByAltText('Wide') as HTMLImageElement
    Object.defineProperties(wide, {
      complete: { value: true }, naturalWidth: { value: 192 }, naturalHeight: { value: 96 },
    })
    fireEvent.load(wide)
    expect(wide.style.width).toBe('96px')
    expect(wide.style.height).toBe('')
    expect(getByAltText('Styled').style.width).toBe('20px')
    expect(ref.current?.contains(wide)).toBe(true)
    expect(source).not.toContain('width: 96px')
    expect(html).not.toContain('width: 96px')

    rerender(<RenderedNoteContent ref={ref} className="note-content" html={SanitizationService.sanitizeForReading('<img src="/tall.png" height="48" alt="Tall">')} />)
    const tall = getByAltText('Tall') as HTMLImageElement
    Object.defineProperties(tall, {
      complete: { value: true }, naturalWidth: { value: 96 }, naturalHeight: { value: 192 },
    })
    fireEvent.load(tall)
    expect(tall.style.width).toBe('24px')
  })

  it('leaves failed and invalid images without computed dimensions', () => {
    const html = SanitizationService.sanitizeForReading('<img src="/missing.png" height="800" alt="Missing"><img src="/invalid.png" height="48px" alt="Invalid">')
    const { getByAltText } = render(<RenderedNoteContent className="note-content" html={html} />)
    const missing = getByAltText('Missing') as HTMLImageElement
    Object.defineProperties(missing, { complete: { value: true }, naturalWidth: { value: 0 }, naturalHeight: { value: 0 } })
    fireEvent.load(missing)
    expect(missing.style.width).toBe('')
    expect(missing.style.height).toBe('')
    expect(getByAltText('Invalid').hasAttribute('height')).toBe(false)
  })
})
