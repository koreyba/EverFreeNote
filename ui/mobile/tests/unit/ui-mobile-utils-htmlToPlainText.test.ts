import { htmlToPlainText } from '@ui/mobile/utils/htmlToPlainText'

describe('ui/mobile/utils/htmlToPlainText', () => {
  describe('empty input', () => {
    it('returns empty string for empty input', () => {
      expect(htmlToPlainText('')).toBe('')
    })
  })

  describe('tag stripping', () => {
    it('strips HTML tags', () => {
      expect(htmlToPlainText('<p>Hello world</p>')).toBe('Hello world')
    })

    it('strips nested tags', () => {
      expect(htmlToPlainText('<p><strong>Bold</strong> text</p>')).toBe('Bold text')
    })
  })

  describe('newline handling', () => {
    it('converts <br> to newline', () => {
      expect(htmlToPlainText('<p>Line 1<br>Line 2</p>')).toBe('Line 1\nLine 2')
    })

    it('converts self-closing <br /> to newline', () => {
      expect(htmlToPlainText('Line 1<br />Line 2')).toBe('Line 1\nLine 2')
    })

    it('converts </p> to double newline (paragraph break)', () => {
      expect(htmlToPlainText('<p>Para 1</p><p>Para 2</p>')).toBe('Para 1\n\nPara 2')
    })

    it('converts </div> to newline', () => {
      expect(htmlToPlainText('<div>Line 1</div><div>Line 2</div>')).toBe('Line 1\nLine 2')
    })

    it('collapses 3+ consecutive newlines to 2', () => {
      expect(htmlToPlainText('<p>A</p><p></p><p>B</p>')).toBe('A\n\nB')
    })

    it('trims leading and trailing whitespace', () => {
      expect(htmlToPlainText('  <p>Hello</p>  ')).toBe('Hello')
    })
  })

  describe('HTML entity decoding', () => {
    it('decodes &amp;', () => {
      expect(htmlToPlainText('A &amp; B')).toBe('A & B')
    })

    it('decodes &lt; and &gt;', () => {
      expect(htmlToPlainText('&lt;tag&gt;')).toBe('<tag>')
    })

    it('decodes &nbsp; to space', () => {
      expect(htmlToPlainText('A&nbsp;B')).toBe('A B')
    })

    it('decodes &quot;', () => {
      expect(htmlToPlainText('Say &quot;hello&quot;')).toBe('Say "hello"')
    })

    it('decodes &#39; (apostrophe)', () => {
      expect(htmlToPlainText('it&#39;s')).toBe("it's")
    })

    it('decodes decimal numeric entities', () => {
      expect(htmlToPlainText('&#65;')).toBe('A') // A = 65
    })

    it('decodes hex numeric entities', () => {
      expect(htmlToPlainText('&#x41;')).toBe('A') // A = 0x41
    })
  })
})
