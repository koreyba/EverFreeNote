import type { EnexResource, ParsedNote } from './types'

export class EnexParser {
  async parse(file: File): Promise<ParsedNote[]> {
    try {
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')

      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Invalid XML format')
      }

      const notes = doc.querySelectorAll('note')
      return Array.from(notes).map((note) => this.parseNote(note))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to parse .enex file: ${message}`)
    }
  }

  private parseNote(noteElement: Element): ParsedNote {
    const title = noteElement.querySelector('title')?.textContent || 'Untitled'
    const contentCDATA = noteElement.querySelector('content')?.textContent || ''
    const content = this.extractContentFromCDATA(contentCDATA)
    const created = this.parseDate(noteElement.querySelector('created')?.textContent)
    const updated = this.parseDate(noteElement.querySelector('updated')?.textContent)
    const tags = Array.from(noteElement.querySelectorAll('tag'))
      .map((tag) => tag.textContent?.trim() ?? '')
      .filter(Boolean)
    const resources = this.parseResources(noteElement)

    return { title, content, created, updated, tags, resources }
  }

  private extractContentFromCDATA(cdata: string): string {
    const match = cdata.match(/<en-note[^>]*>([\s\S]*)<\/en-note>/)
    return match ? match[1] : cdata
  }

  private parseDate(dateString?: string | null): Date {
    if (!dateString) return new Date()
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    const hour = dateString.substring(9, 11)
    const minute = dateString.substring(11, 13)
    const second = dateString.substring(13, 15)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  }

  private parseResources(noteElement: Element): EnexResource[] {
    const resources = noteElement.querySelectorAll('resource')
    return Array.from(resources).map((resource) => {
      const data = resource.querySelector('data')?.textContent || ''
      const mime = resource.querySelector('mime')?.textContent || 'image/png'
      const width = resource.querySelector('width')?.textContent
      const height = resource.querySelector('height')?.textContent
      const fileName = resource.querySelector('file-name')?.textContent

      const res: EnexResource = {
        data: data.trim(),
        mime,
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        fileName: fileName ?? undefined,
      }

      // debug: log resource hash/mime/filename
      try {
        const hash = this.computeMd5FromBase64(res.data)
        console.info('[import:parser] resource', {
          mime: res.mime,
          fileName: res.fileName,
          hash,
        })
        ;(res as EnexResource & { hash: string }).hash = hash
      } catch (e) {
        console.warn('[import:parser] failed to hash resource', { fileName, error: e })
      }

      return res
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
