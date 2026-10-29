import DOMPurify from 'isomorphic-dompurify'
import { SanitizationService } from '@core/services/sanitizer'
import { NoteClipboardService } from '@core/services/noteClipboard'
import { SmartPasteService } from '@core/services/smartPaste'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '@/components/editorExtensions'
import { ContentConverter } from '@core/enex/converter'
import { EnexBuilder } from '@core/enex/enex-builder'
import { EnexParser } from '@core/enex/parser'
import { imageWidthForHeight } from '@core/utils/imageDimensions'

const htmlImage = (html: string) => new DOMParser().parseFromString(html, 'text/html').querySelector('img')!

describe('image dimensions in sanitized note HTML', () => {
  it.each(['default', 'editor-self-copy'] as const)('keeps valid dimensions only on images in %s', (profile) => {
    const html = '<p width="99" height="77">Before<img src="https://example.com/p.png" width="0048" height="96" alt="photo"></p>'
    const doc = new DOMParser().parseFromString(SanitizationService.sanitize(html, { profile }), 'text/html')
    expect(doc.querySelector('p')?.hasAttribute('width')).toBe(false)
    expect(doc.querySelector('p')?.hasAttribute('height')).toBe(false)
    expect(doc.querySelector('img')?.getAttribute('width')).toBe('0048')
    expect(doc.querySelector('img')?.getAttribute('height')).toBe('96')
  })

  it('keeps dimensions and the view-only missing-description fallback in reading mode', () => {
    const image = htmlImage(SanitizationService.sanitizeForReading('<img src="https://example.com/p.png" width="48" height="48">'))
    expect(image.getAttribute('width')).toBe('48')
    expect(image.getAttribute('height')).toBe('48')
    expect(image.getAttribute('alt')).toBe('Image without description')
  })

  it.each(['1', '48', '0048', '16384'])('accepts the safe integer %s', (value) => {
    const image = htmlImage(SanitizationService.sanitize(`<img src="https://example.com/p.png" width="${value}" height="${value}">`))
    expect(image.getAttribute('width')).toBe(value)
    expect(image.getAttribute('height')).toBe(value)
  })

  it.each([
    ['empty', ''], ['zero', '0'], ['negative', '-1'], ['signed', '+48'], ['fraction', '1.5'],
    ['unit', '48px'], ['percentage', '50%'], ['leading space', ' 48'], ['trailing space', '48 '],
    ['NaN', 'NaN'], ['above limit', '16385'], ['huge', '999999999999999999999'], ['excessive padding', '00000000000000000000001'],
  ])('drops the invalid dimension: %s', (_label, value) => {
    const image = htmlImage(SanitizationService.sanitize(`<img src="https://example.com/p.png" width="${value}" height="${value}">`))
    expect(image.hasAttribute('width')).toBe(false)
    expect(image.hasAttribute('height')).toBe(false)
  })

  it('does not keep injected attributes, scripts or unsafe URLs', () => {
    const html = '<p width="10" onclick="bad()">x<img src="javascript:bad()" width="48&quot; onerror=bad()" height="96" onerror="bad()"><script>bad()</script></p>'
    const sanitized = SanitizationService.sanitizeForReading(html)
    const doc = new DOMParser().parseFromString(sanitized, 'text/html')
    const image = doc.querySelector('img')!
    expect(image.hasAttribute('width')).toBe(false)
    expect(image.getAttribute('height')).toBe('96')
    expect(image.hasAttribute('src')).toBe(false)
    expect(image.hasAttribute('onerror')).toBe(false)
    expect(doc.querySelector('[onclick], script, p[width]')).toBeNull()
  })

  it('preserves image dimensions and alt through the clipboard HTML round trip', () => {
    const source = '<p><img src="https://example.com/p.png" width="120" height="80" alt="photo"></p>'
    const payload = NoteClipboardService.buildPayload(source)
    const pasted = SmartPasteService.resolvePaste({ html: payload.html, text: payload.text, types: ['text/html', 'text/plain'] })
    const image = htmlImage(pasted.html)
    expect(image.getAttribute('width')).toBe('120')
    expect(image.getAttribute('height')).toBe('80')
    expect(image.getAttribute('alt')).toBe('photo')
    expect(image.getAttribute('src')).toBe('https://example.com/p.png')
  })

  it('uses explicit dimensions for the displayed aspect ratio without writing the style to the note', () => {
    const source = '<p><img src="https://example.com/p.png" width="96" height="64"></p>'
    const reading = htmlImage(SanitizationService.sanitizeForReading(source))
    expect(reading.style.aspectRatio).toBe('96 / 64')
    const editor = new Editor({ extensions: editorExtensions, content: source })
    try {
      expect(editor.view.dom.querySelector('img')?.style.aspectRatio).toBe('96 / 64')
      expect(editor.getHTML()).not.toContain('aspect-ratio')
    } finally {
      editor.destroy()
    }
  })

  it('sizes height-only images after loading without recording presentation CSS in the note', async () => {
    const source = '<p><img src="https://example.com/p.png" height="48"></p>'
    const reading = htmlImage(SanitizationService.sanitizeForReading(source))
    expect(reading.style.height).toBe('')
    expect(reading.style.objectFit).toBe('')
    const editor = new Editor({ extensions: editorExtensions, content: source })
    try {
      const initial = editor.getHTML()
      const onUpdate = jest.fn()
      editor.on('update', onUpdate)
      const image = editor.view.dom.querySelector('img')!
      expect(image.style.height).toBe('')
      Object.defineProperties(image, {
        complete: { value: true },
        naturalWidth: { value: 192 },
        naturalHeight: { value: 96 },
      })
      image.dispatchEvent(new Event('load'))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(editor.view.dom.querySelector('img')?.style.width).toBe('96px')
      expect(editor.getHTML()).toBe(initial)
      expect(onUpdate).not.toHaveBeenCalled()
      expect(editor.getHTML()).not.toContain('style=')
      expect(editor.getHTML()).toContain('height="48"')
      const payload = NoteClipboardService.buildPayload(editor.getHTML())
      const pasted = SmartPasteService.resolvePaste({ html: payload.html, text: payload.text, types: ['text/html', 'text/plain'] })
      const copiedImage = htmlImage(pasted.html)
      expect(copiedImage.getAttribute('height')).toBe('48')
      expect(copiedImage.hasAttribute('width')).toBe(false)
      expect(copiedImage.hasAttribute('style')).toBe(false)
      expect(copiedImage.hasAttribute('alt')).toBe(false)
    } finally {
      editor.destroy()
    }
  })

  it('requires safe dimensions and usable intrinsic geometry before computing a display width', () => {
    expect(imageWidthForHeight('800', 192, 96)).toBe('1600.000000px')
    expect(imageWidthForHeight('48', 96, 192)).toBe('24.000000px')
    expect(imageWidthForHeight('48px', 192, 96)).toBeNull()
    expect(imageWidthForHeight('16385', 192, 96)).toBeNull()
    expect(imageWidthForHeight('48', 0, 96)).toBeNull()
    expect(imageWidthForHeight('48', 192, 0)).toBeNull()
    expect(imageWidthForHeight('48', Number.NaN, 96)).toBeNull()
    expect(imageWidthForHeight('16384', 10000000, 1)).toBe('16777216.000000px')
    expect(imageWidthForHeight('1', 1, 10000000)).toBe('0.000001px')
  })

  it('tracks image occurrences separately as editing moves or replaces them', async () => {
    const source = '<p>Start<img src="/same.png" height="48" alt="Wide"><img src="/same.png" height="48" alt="Tall"></p>'
    const editor = new Editor({ extensions: editorExtensions, content: source })
    const markLoaded = (image: HTMLImageElement, width: number, height: number) => {
      Object.defineProperties(image, {
        complete: { value: true }, naturalWidth: { value: width }, naturalHeight: { value: height },
      })
      image.dispatchEvent(new Event('load'))
    }
    try {
      const images = editor.view.dom.querySelectorAll('img')
      markLoaded(images[0], 192, 96)
      markLoaded(images[1], 96, 192)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(editor.view.dom.querySelector('img[alt="Wide"]')?.getAttribute('style')).toContain('96px')
      expect(editor.view.dom.querySelector('img[alt="Tall"]')?.getAttribute('style')).toContain('24px')
      editor.commands.insertContentAt(1, 'Before ')
      expect(editor.view.dom.querySelector('img[alt="Wide"]')?.getAttribute('style')).toContain('96px')
      expect(editor.view.dom.querySelector('img[alt="Tall"]')?.getAttribute('style')).toContain('24px')
      expect(editor.getHTML()).not.toContain('style=')

      editor.commands.setContent('<p><img src="/new.png" height="48" alt="New"></p>')
      const replacement = editor.view.dom.querySelector('img')!
      expect(replacement.style.width).toBe('')
      markLoaded(replacement, 96, 192)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(editor.view.dom.querySelector('img')?.style.width).toBe('24px')
      expect(editor.getHTML()).toContain('src="/new.png"')
      expect(editor.getHTML()).not.toContain('style=')
    } finally {
      editor.destroy()
    }
  })

  it('does not add image loads to undo history or emit a content update', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>Start<img src="/slow.png" height="48"></p>' })
    const initial = editor.getHTML()
    const onUpdate = jest.fn()
    editor.on('update', onUpdate)
    try {
      editor.commands.insertContentAt(1, 'Typed ')
      expect(onUpdate).toHaveBeenCalledTimes(1)
      const image = editor.view.dom.querySelector('img')!
      Object.defineProperties(image, {
        complete: { value: true }, naturalWidth: { value: 192 }, naturalHeight: { value: 96 },
      })
      image.dispatchEvent(new Event('load'))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(editor.view.dom.querySelector('img')?.style.width).toBe('96px')
      expect(editor.commands.undo()).toBe(true)
      expect(editor.getHTML()).toBe(initial)
    } finally {
      editor.destroy()
    }
  })

  it('does not change unrelated DOMPurify usage', () => {
    const html = '<img src="https://example.com/p.png" width="nonnumeric">'
    const before = DOMPurify.sanitize(html)
    SanitizationService.sanitize('<img src="https://example.com/p.png" width="48">')
    expect(DOMPurify.sanitize(html)).toBe(before)
  })

  it('removes its sanitizer hook if sanitization throws', () => {
    const html = '<img src="https://example.com/p.png" width="nonnumeric">'
    const before = DOMPurify.sanitize(html)
    const spy = jest.spyOn(DOMPurify, 'sanitize').mockImplementationOnce(() => { throw new Error('synthetic sanitizer failure') })
    expect(() => SanitizationService.sanitize('<p>anything</p>')).toThrow('synthetic sanitizer failure')
    spy.mockRestore()
    expect(DOMPurify.sanitize(html)).toBe(before)
  })

  it('keeps decorative and undescribed ENEX images distinct when importing dimensions', async () => {
    const html = '<en-media type="image/png" hash="abc123" width="80" height="40" alt=""/>' +
      '<en-media type="image/png" hash="abc123" width="96" height="64"/>'
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://example.com/p.png') } as never)
    const imported = await converter.convert(html, [{ data: 'AQ==', mime: 'image/png', hash: 'abc123' }], 'user', 'note')
    const images = new DOMParser().parseFromString(imported, 'text/html').querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[0].getAttribute('alt')).toBe('')
    expect(images[0].getAttribute('width')).toBe('80')
    expect(images[0].getAttribute('height')).toBe('40')
    expect(images[1].hasAttribute('alt')).toBe(false)
    expect(images[1].getAttribute('width')).toBe('96')
    expect(images[1].getAttribute('height')).toBe('64')
  })

  it('preserves an ENEX image description with quoted markup characters', async () => {
    const html = '<en-media type="image/png" hash="abc123" width="48" height="32" alt="A &gt; B &amp; &quot;tree&quot;"/>'
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://example.com/p.png') } as never)
    const imported = await converter.convert(html, [{ data: 'AQ==', mime: 'image/png', hash: 'abc123' }], 'user', 'note')
    const image = htmlImage(imported)
    expect(image.getAttribute('alt')).toBe('A > B & "tree"')
    expect(image.getAttribute('width')).toBe('48')
    expect(image.getAttribute('height')).toBe('32')
  })

  it('treats replacement patterns in an image description as ordinary text', async () => {
    const html = '<en-media type="image/png" hash="abc123" width="48" height="32" alt="Cost $&amp; and $$ and $1"/>'
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://example.com/p.png') } as never)
    const imported = await converter.convert(html, [{ data: 'AQ==', mime: 'image/png', hash: 'abc123' }], 'user', 'note')
    expect(htmlImage(imported).getAttribute('alt')).toBe('Cost $& and $$ and $1')
  })

  it('keeps CDATA terminators in descriptions without breaking the ENEX XML', () => {
    const content = '<p><en-media type="image/png" hash="abc123" width="48" height="32" alt="A ]]> B"/></p>'
    const xml = new EnexBuilder().build([{ title: 'Image', content, created: new Date('2026-01-01'), updated: new Date('2026-01-01'), tags: [], resources: [] }])
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.querySelector('content')?.textContent).toContain(content)
  })

  it('reimports an actual ENEX document with its original size and special-character description', async () => {
    const hash = '55a54008ad1ba589aa210d2629c1df41'
    const content = `<p>Literal ]]> body</p><p><en-media type="image/png" hash="${hash}" width="96" height="64" alt="A &gt; B &amp; $&amp;"/></p>`
    const xml = new EnexBuilder().build([{
      title: 'Image', content, created: new Date('2026-01-01'), updated: new Date('2026-01-01'), tags: ['qa'],
      resources: [{ data: 'AQ==', mime: 'image/png', hash, width: 192, height: 192, fileName: 'synthetic.png' }],
    }])
    const [note] = await new EnexParser().parse({ text: async () => xml } as File)
    const converter = new ContentConverter({ upload: jest.fn().mockResolvedValue('https://example.com/p.png') } as never)
    const imported = await converter.convert(note.content, note.resources, 'user', 'note')
    const image = htmlImage(imported)
    expect(image.getAttribute('width')).toBe('96')
    expect(image.getAttribute('height')).toBe('64')
    expect(image.getAttribute('alt')).toBe('A > B & $&')
    expect(new DOMParser().parseFromString(imported, 'text/html').body.textContent).toContain('Literal ]]> body')
    expect(note.tags).toEqual(['qa'])
  })
})
