/** @jest-environment jsdom */

import { NoteCopyService } from '../../services/noteCopy'

describe('NoteCopyService DOM behavior', () => {
  it('recognizes and unwraps the only top-level self-copy wrapper', () => {
    const html = '<div data-everfreenote-copy="note-body"><p>Copied</p></div>'
    expect(NoteCopyService.isSelfCopyHtml(html)).toBe(true)
    expect(NoteCopyService.unwrapSelfCopyHtml(html)).toContain('<p>Copied</p>')
    expect(NoteCopyService.isSelfCopyHtml('<div data-everfreenote-copy="note-body"><p>A</p></div><p>B</p>')).toBe(false)
    expect(NoteCopyService.unwrapSelfCopyHtml('<p>Regular</p>')).toContain('Regular')
  })

  it('handles empty input and nested wrapper content', () => {
    expect(NoteCopyService.isSelfCopyHtml('')).toBe(false)
    expect(NoteCopyService.unwrapSelfCopyHtml('')).toBe('')
    const html = '<div data-everfreenote-copy="note-body"><div><strong>Nested</strong></div></div>'
    expect(NoteCopyService.unwrapSelfCopyHtml(html)).toContain('Nested')
  })
})
