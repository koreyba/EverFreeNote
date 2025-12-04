import DOMPurify from 'isomorphic-dompurify'

import { ImageProcessor } from './image-processor'
import type { EnexResource } from './types'

export class ContentConverter {
  private readonly imageProcessor: ImageProcessor
  private readonly CONCURRENCY_LIMIT = 5

  constructor(imageProcessor: ImageProcessor) {
    this.imageProcessor = imageProcessor
  }

  async convert(
    html: string,
    resources: EnexResource[] = [],
    userId: string,
    noteId: string,
    noteTitle = 'Untitled'
  ): Promise<string> {
    let converted = html
    converted = this.replaceUnsupported(converted)
    converted = await this.processImages(converted, resources, userId, noteId, noteTitle)
    converted = this.cleanupENML(converted)

    // Sanitize HTML to prevent XSS attacks
    type DomPurifyConfig = Parameters<typeof DOMPurify.sanitize>[1]

    const sanitizeOptions: DomPurifyConfig & {
      ALLOWED_STYLES?: Record<string, Record<string, RegExp[]>>
    } = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'img', 'a', 'div', 'span', 'blockquote', 'code',
        'hr', 's', 'sub', 'sup'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
      ALLOWED_STYLES: {
        '*': {
          'color': [/^#[0-9a-f]{3,6}$/i],
          'background-color': [/^#[0-9a-f]{3,6}$/i],
          'text-align': [/^(left|right|center|justify)$/],
          'font-size': [/^\d+(px|em|rem|%)$/],
          'font-weight': [/^(normal|bold|\d{3})$/]
        }
      }
    }

    const sanitized: string | { toString(): string } = DOMPurify.sanitize(converted, sanitizeOptions)
    converted = typeof sanitized === 'string' ? sanitized : sanitized.toString()

    return converted
  }

  private replaceUnsupported(html: string): string {
    const replacements: Record<string, string> = {
      '<table': '[Unsupported content: Table]<div style="display:none"><table',
      '</table>': '</table></div>',
      '<pre': '[Unsupported content: Code Block]<div style="display:none"><pre',
      '</pre>': '</pre></div>',
      '<en-todo': '[Unsupported content: Checkbox]<div style="display:none"><en-todo',
      '</en-todo>': '</en-todo></div>',
      '<en-crypt': '[Unsupported content: Encrypted Text]<div style="display:none"><en-crypt',
      '</en-crypt>': '</en-crypt></div>'
    }

    let result = html
    for (const [pattern, replacement] of Object.entries(replacements)) {
      result = result.replace(new RegExp(pattern, 'gi'), replacement)
    }

    return result
  }

  private async processImages(
    html: string,
    resources: EnexResource[],
    userId: string,
    noteId: string,
    noteTitle: string
  ): Promise<string> {
    if (!resources || resources.length === 0) return html

    // Build hash -> resource map using md5 of base64 (for matching by hash)
    const resourceMap = new Map<string, EnexResource>()
    resources.forEach((res) => {
      const hash = (res.hash || this.computeMd5FromBase64(res.data)).toLowerCase()
      res.hash = hash
      if (!resourceMap.has(hash)) {
        resourceMap.set(hash, res)
      }
    })

    const uploadedUrls: Array<string | null> = []

    // Process images in batches to limit concurrency
    for (let i = 0; i < resources.length; i += this.CONCURRENCY_LIMIT) {
      const batch = resources.slice(i, i + this.CONCURRENCY_LIMIT)

      const batchResults = await Promise.all(
        batch.map(async (resource, batchIndex) => {
          try {
            const url = await this.imageProcessor.upload(
              resource.data,
              resource.mime,
              userId,
              noteId,
              `image_${i + batchIndex}`
            )
            return url
          } catch (error) {
            console.error('Failed to upload image:', error)
            return null
          }
        })
      )

      uploadedUrls.push(...batchResults)
    }

    // Replace <en-media> tags with <img> tags
    let result = html
    const mediaMatches = Array.from(result.matchAll(/<en-media[^>]*hash="([^"]+)"[^>]*\/>/gi))
    mediaMatches.forEach((match, idx) => {
      const hash = match[1].toLowerCase()
      const resource = resourceMap.get(hash)
      const uploadUrl = resource ? uploadedUrls[resources.indexOf(resource)] : null

      let replacement: string
      if (resource && uploadUrl) {
        replacement = `<img src="${uploadUrl}" alt="Image ${idx + 1}" data-original-hash="${hash}" data-original-order="${idx}" />`
      } else if (resource) {
        replacement = `<img src="data:${resource.mime};base64,${resource.data}" alt="Image ${idx + 1}" data-original-hash="${hash}" data-original-order="${idx}" />`
      } else {
        console.warn('[import] missing resource for en-media', { hash, noteTitle })
        replacement = `[Image missing: ${hash}]`
      }

      result = result.replace(match[0], replacement)
    })

    return result
  }

  private cleanupENML(html: string): string {
    let result = html
      // Удаляем en-note обёртку полностью
      .replace(/<en-note[^>]*>/gi, '')
      .replace(/<\/en-note>/gi, '')

    // Нормализуем div в p для текстовых блоков
    // Заменяем только простые div (без вложенных блочных элементов)
    result = this.normalizeDivsToP(result)

    // Удаляем пустые параграфы с только пробельными символами (включая &hairsp;, &nbsp;, etc.)
    result = this.removeEmptyParagraphs(result)

    return result
  }

  private removeEmptyParagraphs(html: string): string {
    // Удаляем <p> содержащие только пробельные символы, &nbsp;, &hairsp;, <br> и т.д.
    return html
      // Удаляем пустые <p> в начале
      .replace(/^(\s*<p[^>]*>(\s|&nbsp;|&hairsp;|&#8202;|<br\s*\/?>)*<\/p>\s*)+/gi, '')
      // Удаляем пустые <p> в конце
      .replace(/(\s*<p[^>]*>(\s|&nbsp;|&hairsp;|&#8202;|<br\s*\/?>)*<\/p>\s*)+$/gi, '')
  }

  private normalizeDivsToP(html: string): string {
    // Заменяем <div> на <p> только если внутри нет блочных элементов
    // Используем простую замену для div без атрибутов или с style
    const blockElements = ['div', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'table', 'hr']
    const blockPattern = blockElements.map(el => `<${el}[\\s>]`).join('|')

    // Разбиваем на div блоки и проверяем каждый
    return html.replace(/<div([^>]*)>([\s\S]*?)<\/div>/gi, (match, attrs, content) => {
      // Если внутри есть блочные элементы, оставляем div
      if (new RegExp(blockPattern, 'i').test(content)) {
        return match
      }
      // Иначе заменяем на p
      return `<p${attrs}>${content}</p>`
    })
  }

  private computeMd5FromBase64(base64Data: string): string {
    const binaryString = atob(base64Data)
    const len = binaryString.length
    const buffer = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      buffer[i] = binaryString.charCodeAt(i)
    }
    return this.computeMd5(buffer.buffer)
  }

  private computeMd5(buffer: ArrayBuffer): string {
    const data = new Uint8Array(buffer)
    const originalLength = data.length
    const paddedLength = (((originalLength + 8) >>> 6) + 1) << 4
    const words = new Uint32Array(paddedLength)

    for (let i = 0; i < originalLength; i++) {
      words[i >> 2] |= data[i] << ((i % 4) << 3)
    }
    words[originalLength >> 2] |= 0x80 << ((originalLength % 4) << 3)
    words[paddedLength - 2] = originalLength << 3
    words[paddedLength - 1] = originalLength >>> 29

    let a = 0x67452301
    let b = 0xefcdab89
    let c = 0x98badcfe
    let d = 0x10325476

    const ff = (q: number, a1: number, b1: number, x: number, s: number, t: number) =>
      this.rotateLeft(a1 + q + x + t, s) + b1
    const gg = (q: number, a1: number, b1: number, x: number, s: number, t: number) =>
      this.rotateLeft(a1 + q + x + t, s) + b1
    const hh = (q: number, a1: number, b1: number, x: number, s: number, t: number) =>
      this.rotateLeft(a1 + q + x + t, s) + b1
    const ii = (q: number, a1: number, b1: number, x: number, s: number, t: number) =>
      this.rotateLeft(a1 + q + x + t, s) + b1

    for (let i = 0; i < words.length; i += 16) {
      const oa = a
      const ob = b
      const oc = c
      const od = d

      // Round 1
      a = ff((b & c) | (~b & d), a, b, words[i + 0], 7, 0xd76aa478)
      d = ff((a & b) | (~a & c), d, a, words[i + 1], 12, 0xe8c7b756)
      c = ff((d & a) | (~d & b), c, d, words[i + 2], 17, 0x242070db)
      b = ff((c & d) | (~c & a), b, c, words[i + 3], 22, 0xc1bdceee)
      a = ff((b & c) | (~b & d), a, b, words[i + 4], 7, 0xf57c0faf)
      d = ff((a & b) | (~a & c), d, a, words[i + 5], 12, 0x4787c62a)
      c = ff((d & a) | (~d & b), c, d, words[i + 6], 17, 0xa8304613)
      b = ff((c & d) | (~c & a), b, c, words[i + 7], 22, 0xfd469501)
      a = ff((b & c) | (~b & d), a, b, words[i + 8], 7, 0x698098d8)
      d = ff((a & b) | (~a & c), d, a, words[i + 9], 12, 0x8b44f7af)
      c = ff((d & a) | (~d & b), c, d, words[i + 10], 17, 0xffff5bb1)
      b = ff((c & d) | (~c & a), b, c, words[i + 11], 22, 0x895cd7be)
      a = ff((b & c) | (~b & d), a, b, words[i + 12], 7, 0x6b901122)
      d = ff((a & b) | (~a & c), d, a, words[i + 13], 12, 0xfd987193)
      c = ff((d & a) | (~d & b), c, d, words[i + 14], 17, 0xa679438e)
      b = ff((c & d) | (~c & a), b, c, words[i + 15], 22, 0x49b40821)

      // Round 2
      a = gg((b & d) | (c & ~d), a, b, words[i + 1], 5, 0xf61e2562)
      d = gg((a & c) | (b & ~c), d, a, words[i + 6], 9, 0xc040b340)
      c = gg((d & b) | (a & ~b), c, d, words[i + 11], 14, 0x265e5a51)
      b = gg((c & a) | (d & ~a), b, c, words[i + 0], 20, 0xe9b6c7aa)
      a = gg((b & d) | (c & ~d), a, b, words[i + 5], 5, 0xd62f105d)
      d = gg((a & c) | (b & ~c), d, a, words[i + 10], 9, 0x02441453)
      c = gg((d & b) | (a & ~b), c, d, words[i + 15], 14, 0xd8a1e681)
      b = gg((c & a) | (d & ~a), b, c, words[i + 4], 20, 0xe7d3fbc8)
      a = gg((b & d) | (c & ~d), a, b, words[i + 9], 5, 0x21e1cde6)
      d = gg((a & c) | (b & ~c), d, a, words[i + 14], 9, 0xc33707d6)
      c = gg((d & b) | (a & ~b), c, d, words[i + 3], 14, 0xf4d50d87)
      b = gg((c & a) | (d & ~a), b, c, words[i + 8], 20, 0x455a14ed)
      a = gg((b & d) | (c & ~d), a, b, words[i + 13], 5, 0xa9e3e905)
      d = gg((a & c) | (b & ~c), d, a, words[i + 2], 9, 0xfcefa3f8)
      c = gg((d & b) | (a & ~b), c, d, words[i + 7], 14, 0x676f02d9)
      b = gg((c & a) | (d & ~a), b, c, words[i + 12], 20, 0x8d2a4c8a)

      // Round 3
      a = hh(b ^ c ^ d, a, b, words[i + 5], 4, 0xfffa3942)
      d = hh(a ^ b ^ c, d, a, words[i + 8], 11, 0x8771f681)
      c = hh(d ^ a ^ b, c, d, words[i + 11], 16, 0x6d9d6122)
      b = hh(c ^ d ^ a, b, c, words[i + 14], 23, 0xfde5380c)
      a = hh(b ^ c ^ d, a, b, words[i + 1], 4, 0xa4beea44)
      d = hh(a ^ b ^ c, d, a, words[i + 4], 11, 0x4bdecfa9)
      c = hh(d ^ a ^ b, c, d, words[i + 7], 16, 0xf6bb4b60)
      b = hh(c ^ d ^ a, b, c, words[i + 10], 23, 0xbebfbc70)
      a = hh(b ^ c ^ d, a, b, words[i + 13], 4, 0x289b7ec6)
      d = hh(a ^ b ^ c, d, a, words[i + 0], 11, 0xeaa127fa)
      c = hh(d ^ a ^ b, c, d, words[i + 3], 16, 0xd4ef3085)
      b = hh(c ^ d ^ a, b, c, words[i + 6], 23, 0x04881d05)
      a = hh(b ^ c ^ d, a, b, words[i + 9], 4, 0xd9d4d039)
      d = hh(a ^ b ^ c, d, a, words[i + 12], 11, 0xe6db99e5)
      c = hh(d ^ a ^ b, c, d, words[i + 15], 16, 0x1fa27cf8)
      b = hh(c ^ d ^ a, b, c, words[i + 2], 23, 0xc4ac5665)

      // Round 4
      a = ii(c ^ (b | ~d), a, b, words[i + 0], 6, 0xf4292244)
      d = ii(b ^ (a | ~c), d, a, words[i + 7], 10, 0x432aff97)
      c = ii(a ^ (d | ~b), c, d, words[i + 14], 15, 0xab9423a7)
      b = ii(d ^ (c | ~a), b, c, words[i + 5], 21, 0xfc93a039)
      a = ii(c ^ (b | ~d), a, b, words[i + 12], 6, 0x655b59c3)
      d = ii(b ^ (a | ~c), d, a, words[i + 3], 10, 0x8f0ccc92)
      c = ii(a ^ (d | ~b), c, d, words[i + 10], 15, 0xffeff47d)
      b = ii(d ^ (c | ~a), b, c, words[i + 1], 21, 0x85845dd1)
      a = ii(c ^ (b | ~d), a, b, words[i + 8], 6, 0x6fa87e4f)
      d = ii(b ^ (a | ~c), d, a, words[i + 15], 10, 0xfe2ce6e0)
      c = ii(a ^ (d | ~b), c, d, words[i + 6], 15, 0xa3014314)
      b = ii(d ^ (c | ~a), b, c, words[i + 13], 21, 0x4e0811a1)
      a = ii(c ^ (b | ~d), a, b, words[i + 4], 6, 0xf7537e82)
      d = ii(b ^ (a | ~c), d, a, words[i + 11], 10, 0xbd3af235)
      c = ii(a ^ (d | ~b), c, d, words[i + 2], 15, 0x2ad7d2bb)
      b = ii(d ^ (c | ~a), b, c, words[i + 9], 21, 0xeb86d391)

      a = (a + oa) >>> 0
      b = (b + ob) >>> 0
      c = (c + oc) >>> 0
      d = (d + od) >>> 0
    }

    return [a, b, c, d].map((x) => this.toHexLe(x)).join('')
  }

  private rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift))
  }

  private toHexLe(num: number): string {
    const hex = (num >>> 0).toString(16)
    return ('00000000' + hex).slice(-8).match(/../g)?.reverse().join('') ?? ''
  }
}
