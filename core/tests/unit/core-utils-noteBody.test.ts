import { isNoteBodyEmpty } from '@core/utils/noteBody'

describe('core/utils/noteBody.isNoteBodyEmpty', () => {
  it('treats empty, whitespace and empty editor markup as empty', () => {
    expect(isNoteBodyEmpty('')).toBe(true)
    expect(isNoteBodyEmpty('   ')).toBe(true)
    expect(isNoteBodyEmpty('<p></p>')).toBe(true)
    expect(isNoteBodyEmpty('<p><br></p>')).toBe(true)
    expect(isNoteBodyEmpty('<p>&nbsp;</p>')).toBe(true)
  })

  it('treats text or image content as non-empty', () => {
    expect(isNoteBodyEmpty('<p>Hello</p>')).toBe(false)
    expect(isNoteBodyEmpty('<p><img src="data:image/png;base64,abc"></p>')).toBe(false)
  })
})
