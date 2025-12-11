import DOMPurify from 'isomorphic-dompurify'

export class SanitizationService {
  /**
   * Sanitizes HTML content to prevent XSS attacks.
   * Allows safe tags like <b>, <i>, <p>, lists, etc.
   * Removes <script>, <iframe>, and other dangerous tags.
   */
  static sanitize(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
        'span', 'div', 'img', 'mark', 'u', 's', 'strike',
      ],
      ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'style', 'title'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    })
  }

  /**
   * Strips all HTML tags, returning only text.
   * Useful for generating plain text previews or search indexing.
   */
  static stripHtml(html: string): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
  }
}
