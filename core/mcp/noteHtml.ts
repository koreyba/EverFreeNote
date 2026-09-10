// Write-side sanitization for note bodies coming from AI agents.
//
// Agents are untrusted input: an agent (or a prompt injected into one) can send
// arbitrary markup to create_note / update_note. The web and mobile clients do
// sanitize on render, but a note is also published through public share links,
// so hostile markup must never reach the database in the first place.
//
// The allowlist mirrors core/services/sanitizer.ts (the render-side DOMPurify
// profile) so agent-authored notes render identically to hand-written ones.

import sanitizeHtml from 'sanitize-html'

export const NOTE_ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'hr', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'span', 'div', 'img', 'mark', 'u', 's', 'strike',
]

export const NOTE_ALLOWED_ATTRIBUTES = [
  'href', 'target', 'src', 'alt', 'class', 'style', 'title', 'data-checked', 'data-type',
]

const SANITIZE_OPTIONS = {
  allowedTags: NOTE_ALLOWED_TAGS,
  allowedAttributes: { '*': NOTE_ALLOWED_ATTRIBUTES },
  // Links: no javascript:/vbscript:. Images may additionally carry data: URIs,
  // which the editor produces for pasted screenshots.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Drop the content of dangerous elements instead of keeping their text.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
  disallowedTagsMode: 'discard' as const,
}

/**
 * Returns the note body with only editor-supported markup left: unknown or
 * dangerous elements, event handlers and script-bearing URLs are removed.
 */
export function sanitizeNoteHtml(input: string | null | undefined): string {
  if (!input) return ''
  return sanitizeHtml(input, SANITIZE_OPTIONS)
}
