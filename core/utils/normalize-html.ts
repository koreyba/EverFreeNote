/**
 * Normalizes HTML content to ensure consistent structure between
 * imported notes and notes created in the editor.
 *
 * Main transformations:
 * - Converts simple <div> elements to <p> elements
 * - Removes en-note wrappers
 * - Preserves block-level structure
 */

const BLOCK_ELEMENTS = ['div', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'table', 'hr']

export function normalizeHtml(html: string): string {
  let result = html
    // Remove en-note wrapper
    .replace(/<en-note[^>]*>/gi, '')
    .replace(/<\/en-note>/gi, '')

  // Normalize divs to p
  result = normalizeDivsToP(result)

  return result
}

function normalizeDivsToP(html: string): string {
  const blockPattern = BLOCK_ELEMENTS.map(el => `<${el}[\\s>]`).join('|')

  // Replace <div> with <p> only if no block elements inside
  return html.replace(/<div([^>]*)>([\s\S]*?)<\/div>/gi, (match, attrs, content) => {
    // If contains block elements, keep as div
    if (new RegExp(blockPattern, 'i').test(content)) {
      return match
    }
    // Otherwise replace with p
    return `<p${attrs}>${content}</p>`
  })
}

export function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = normalized.split(/\n{2,}/)
  return paragraphs
    .map(section => escapeHtml(section).replace(/\n/g, '<br />'))
    .map(section => `<p>${section}</p>`)
    .join('')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
