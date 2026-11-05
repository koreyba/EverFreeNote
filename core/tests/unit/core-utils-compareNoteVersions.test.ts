import { compareNoteVersions } from '@core/utils/compareNoteVersions'

const emptyNote = { title: null, description: null, tags: null }

describe('compareNoteVersions', () => {
  it('shows the title and formatted body changes from current to selected', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, title: 'Packing list', description: '<p>Notebook</p><p>One&nbsp;charger</p>' },
      { ...emptyNote, title: 'Travel list', description: '<p>Notebook</p><p>Two&nbsp;charger</p>' },
    )

    expect(comparison.title).toEqual({
      parts: [
        { kind: 'removed', text: 'Packing' },
        { kind: 'added', text: 'Travel' },
        { kind: 'unchanged', text: ' list' },
      ],
      limited: false,
    })
    expect(comparison.body).toEqual({
      parts: [
        { kind: 'unchanged', text: 'Notebook\n' },
        { kind: 'removed', text: 'One' },
        { kind: 'added', text: 'Two' },
        { kind: 'unchanged', text: ' charger' },
      ],
      limited: false,
    })
  })

  it('shows a multi-paragraph rewrite as whole blocks around unchanged text', () => {
    const comparison = compareNoteVersions(
      {
        ...emptyNote,
        description: '<p>План поездки</p><p>Жду встречу в офисе в пятницу.</p>'
          + '<p>Заберу документы и ключи.</p><p>Контакты</p>',
      },
      {
        ...emptyNote,
        description: '<p>План поездки</p><p>Пишу план в поезде в субботу.</p>'
          + '<p>Подготовлю презентацию и отчёт.</p><p>Контакты</p>',
      },
    )

    expect(comparison.body).toEqual({
      parts: [
        { kind: 'unchanged', text: 'План поездки\n', block: true },
        { kind: 'removed', text: 'Жду встречу в офисе в пятницу.\nЗаберу документы и ключи.\n', block: true },
        { kind: 'added', text: 'Пишу план в поезде в субботу.\nПодготовлю презентацию и отчёт.\n', block: true },
        { kind: 'unchanged', text: 'Контакты', block: true },
      ],
      limited: false,
    })
  })

  it('recognizes the previous last paragraph as unchanged when a paragraph is appended', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, description: '<p>Packing list</p>' },
      { ...emptyNote, description: '<p>Packing list</p><p>Spare charger</p>' },
    )

    expect(comparison.body?.parts).toEqual([
      { kind: 'unchanged', text: 'Packing list\n', block: true },
      { kind: 'added', text: 'Spare charger', block: true },
    ])
  })

  it('keeps Cyrillic words and emoji clusters intact', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, title: 'Старый 👩‍💻 план' },
      { ...emptyNote, title: 'Новый 👨‍💻 план' },
    )

    expect(comparison.title?.parts).toEqual([
      { kind: 'removed', text: 'Старый' },
      { kind: 'added', text: 'Новый' },
      { kind: 'unchanged', text: ' ' },
      { kind: 'removed', text: '👩‍💻' },
      { kind: 'added', text: '👨‍💻' },
      { kind: 'unchanged', text: ' план' },
    ])
  })

  it('treats empty legacy fields and empty editor fields as the same content', () => {
    const comparison = compareNoteVersions(emptyNote, { title: '', description: '', tags: [] })

    expect(comparison).toEqual({
      title: null,
      body: null,
      bodyMarkupChanged: false,
      addedTags: [],
      removedTags: [],
      tagOrderChanged: false,
    })
  })

  it('reports changes that only affect formatting', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, description: '<p>Same text</p>' },
      { ...emptyNote, description: '<p><strong>Same text</strong></p>' },
    )

    expect(comparison.body).toBeNull()
    expect(comparison.bodyMarkupChanged).toBe(true)
  })

  it('reports image changes when the visible description is the same', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, description: '<p><img src="current.png" alt="Map"></p>' },
      { ...emptyNote, description: '<p><img src="older.png" alt="Map"></p>' },
    )

    expect(comparison.body).toBeNull()
    expect(comparison.bodyMarkupChanged).toBe(true)
  })

  it('shows tags added and removed by the selected version', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, tags: ['retained', 'current'] },
      { ...emptyNote, tags: ['retained', 'older'] },
    )

    expect(comparison.addedTags).toEqual(['older'])
    expect(comparison.removedTags).toEqual(['current'])
    expect(comparison.tagOrderChanged).toBe(false)
  })

  it('identifies a change to tag order without inventing additions or removals', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, tags: ['retained', 'older'] },
      { ...emptyNote, tags: ['older', 'retained'] },
    )

    expect(comparison.addedTags).toEqual([])
    expect(comparison.removedTags).toEqual([])
    expect(comparison.tagOrderChanged).toBe(true)
  })

  it('limits divergent body text while still comparing the other fields', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, description: `<p>${'current '.repeat(1_000)}</p>`, tags: ['draft'] },
      { ...emptyNote, description: `<p>${'saved '.repeat(1_000)}</p>`, tags: ['review'] },
    )

    expect(comparison.body).toEqual({ parts: [], limited: true })
    expect(comparison.addedTags).toEqual(['review'])
    expect(comparison.removedTags).toEqual(['draft'])
    expect(comparison.bodyMarkupChanged).toBe(false)
  })

  it('limits oversized markup before reading the body', () => {
    const comparison = compareNoteVersions(
      { ...emptyNote, description: `<p><img src="data:image/png;base64,${'a'.repeat(1_000_000)}"></p>` },
      { ...emptyNote, description: '<p>Saved text</p>' },
    )

    expect(comparison.body).toEqual({ parts: [], limited: true })
    expect(comparison.bodyMarkupChanged).toBe(false)
  })
})
