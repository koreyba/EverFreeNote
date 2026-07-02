import DOMPurify from 'isomorphic-dompurify'

type SanitizationProfile = 'default' | 'editor-self-copy'

type SanitizeOptions = {
  profile?: SanitizationProfile
}

const DEFAULT_ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'hr', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'span', 'div', 'img', 'mark', 'u', 's', 'strike',
]

const SELF_COPY_ALLOWED_TAGS = [
  ...DEFAULT_ALLOWED_TAGS,
  'label',
  'input',
  // Superscript/Subscript marks are stored by the editor; preserve on self-copy round-trip.
  'sup',
  'sub',
]

const DEFAULT_ALLOWED_ATTR = ['href', 'target', 'src', 'alt', 'class', 'style', 'title']
const DEFAULT_ALLOWED_DATA_ATTR = ['data-checked', 'data-type']

const SELF_COPY_ALLOWED_ATTR = [
  ...DEFAULT_ALLOWED_ATTR,
  ...DEFAULT_ALLOWED_DATA_ATTR,
  'type',
  'checked',
  'disabled',
  // EverFreeNote self-copy marker — must survive sanitization so the paste
  // pipeline can detect/unwrap it and take the high-fidelity self-copy path.
  'data-everfreenote-copy',
  // Marks a paragraph NoteClipboardService fabricated to represent a
  // single-Enter boundary as a blank line for external paste targets — must
  // survive sanitization so the self-copy paste path can strip it back out
  // before re-inserting into the editor (core/services/noteClipboard.ts).
  'data-everfreenote-gap',
  // ProseMirror's own clipboard slice marker — preserved so pasting back into
  // any EverFreeNote editor can use PM's native slice reconstruction (exact
  // open/close boundaries) instead of re-parsing HTML.
  'data-pm-slice',
]

export class SanitizationService {
  /**
   * Sanitizes HTML content to prevent XSS attacks.
   * Allows safe tags like <b>, <i>, <p>, lists, etc.
   * Removes <script>, <iframe>, and other dangerous tags.
   */
  static sanitize(html: string, options: SanitizeOptions = {}): string {
    const profile = options.profile ?? 'default'
    const isEditorSelfCopy = profile === 'editor-self-copy'

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: isEditorSelfCopy ? SELF_COPY_ALLOWED_TAGS : DEFAULT_ALLOWED_TAGS,
      ALLOWED_ATTR: isEditorSelfCopy
        ? SELF_COPY_ALLOWED_ATTR
        : [...DEFAULT_ALLOWED_ATTR, ...DEFAULT_ALLOWED_DATA_ATTR],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: isEditorSelfCopy
        ? ['script', 'iframe', 'object', 'embed', 'form', 'button']
        : ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    })
  }

  /**
   * Strips all HTML tags, returning only text.
   * Useful for generating plain text previews or search indexing.
   */
  static stripHtml(html: string): string {
    // First pass: use DOMPurify to remove dangerous tags AND their content.
    // KEEP_CONTENT: false ensures script/style inner text doesn't leak.
    const safe = DOMPurify.sanitize(html, {
      FORBID_TAGS: ['script', 'style'],
      FORBID_CONTENTS: ['script', 'style'],
    })
    // Second pass: strip all remaining tags, leaving only text.
    return DOMPurify.sanitize(safe, { ALLOWED_TAGS: [] })
  }
}
