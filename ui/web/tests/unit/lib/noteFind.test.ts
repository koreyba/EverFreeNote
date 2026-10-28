import { findInNote } from '@ui/web/lib/noteFind'

describe('findInNote', () => {
  it('finds literal punctuation rather than interpreting it as a pattern', () => {
    const body = document.createElement('div')
    body.innerHTML = '<p>a+a and aaaa</p>'
    const matches = findInNote(null, body, 'a+a')
    expect(matches).toHaveLength(1)
    expect(matches[0].kind === 'text' && matches[0].range.toString()).toBe('a+a')
  })

  it('preserves original text offsets after characters whose lowercase form expands', () => {
    const body = document.createElement('div')
    body.innerHTML = '<p>İ needle and nee<strong>dle</strong></p>'
    const matches = findInNote(null, body, 'needle')
    expect(matches).toHaveLength(2)
    expect(matches.map((match) => match.kind === 'text' && match.range.toString())).toEqual(['needle', 'needle'])
    expect(matches[0].kind === 'text' && matches[0].range.startOffset).toBe(2)
  })

  it('matches Unicode case variants without losing the original text', () => {
    const body = document.createElement('div')
    body.textContent = 'Σ ς σ'
    const matches = findInNote(null, body, 'σ')
    expect(matches.map((match) => match.kind === 'text' && match.range.toString())).toEqual(['Σ', 'ς', 'σ'])
  })

  it('keeps Unicode case folding distinct from multi-character and Turkish variants', () => {
    const body = document.createElement('div')
    body.textContent = 'I ı İ i ß ẞ'
    expect(findInNote(null, body, 'i').map((match) => match.kind === 'text' && match.range.toString())).toEqual(['I', 'i'])
    expect(findInNote(null, body, 'ß').map((match) => match.kind === 'text' && match.range.toString())).toEqual(['ß', 'ẞ'])
  })

  it('preserves emoji boundaries and finds matches in the editable title', () => {
    const title = document.createElement('input')
    title.value = '😀 Test'
    const matches = findInNote(title, null, 'test')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ kind: 'title', start: 3, end: 7 })
    expect(findInNote(title, null, '\ud83d')).toHaveLength(0)
  })
})
