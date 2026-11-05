import { applyContentEdits, contentEditSchema } from '@core/mcp/noteEdits'
import { notebookSearchInputSchema } from '@core/mcp/notebookSearch'

const body = '<h2>Plan</h2><p>First <strong>important</strong> item</p><p>Last</p>'

describe('MCP HTML block editing', () => {
  it('prepends, inserts after and replaces blocks sequentially', () => {
    expect(applyContentEdits(body, [
      { operation: 'prepend', content_html: '<p>Intro</p>' },
      { operation: 'insert_after', anchor_html: '<h2>Plan</h2>', content_html: '<p>Middle</p>' },
      { operation: 'replace', anchor_html: '<p>Middle</p>', content_html: '<p>Revised</p>' },
    ])).toBe('<p>Intro</p><h2>Plan</h2><p>Revised</p><p>First <strong>important</strong> item</p><p>Last</p>')
  })

  it('replaces several adjacent blocks and can deliberately remove a complete block', () => {
    expect(applyContentEdits(body, [{ operation: 'replace', anchor_html: '<h2>Plan</h2><p>First <strong>important</strong> item</p>', content_html: '' }])).toBe('<p>Last</p>')
  })

  it('rejects missing, ambiguous and nested anchors instead of guessing', () => {
    expect(() => applyContentEdits(body, [{ operation: 'insert_before', anchor_html: '<p>Missing</p>', content_html: '<p>New</p>' }])).toThrow('not found')
    expect(() => applyContentEdits('<p>Same</p><p>Same</p>', [{ operation: 'replace', anchor_html: '<p>Same</p>', content_html: '' }])).toThrow('ambiguous')
    expect(() => applyContentEdits(body, [{ operation: 'replace', anchor_html: '<strong>important</strong>', content_html: '<em>changed</em>' }])).toThrow('complete top-level')
  })

  it('sanitizes only the new fragment and preserves existing formatting byte-for-byte', () => {
    const existing = '<p style="color: red">Existing <sup>2</sup></p>'
    expect(applyContentEdits(existing, [{ operation: 'append', content_html: '<script>attack()</script><p onclick="attack()">Safe</p>' }])).toBe(existing + '<p>Safe</p>')
  })

  it('rejects additions that sanitize to nothing and bounds combined new content', () => {
    expect(() => applyContentEdits('', [{ operation: 'append', content_html: '<script>attack()</script>' }])).toThrow('no supported content')
    expect(() => applyContentEdits('', Array.from({ length: 6 }, () => ({ operation: 'append' as const, content_html: 'x'.repeat(200_000) })))).toThrow('1000000')
  })

  it('rejects missing anchors, unexpected arguments and empty additions at the schema boundary', () => {
    expect(contentEditSchema.safeParse({ operation: 'replace', content_html: '<p>New</p>' }).success).toBe(false)
    expect(contentEditSchema.safeParse({ operation: 'append', anchor_html: '<p>Old</p>', content_html: '<p>New</p>' }).success).toBe(false)
    expect(contentEditSchema.safeParse({ operation: 'append', content_html: '' }).success).toBe(false)
  })
})

describe('MCP search date ranges', () => {
  it('compares instants with timezone offsets and rejects inverted ranges', () => {
    expect(notebookSearchInputSchema.safeParse({ query: 'plan', created_after: '2026-10-01T02:00:00+02:00', created_before: '2026-10-01T00:00:00Z' }).success).toBe(false)
    expect(notebookSearchInputSchema.safeParse({ query: 'plan', updated_after: '2026-11-01T00:00:00Z', updated_before: '2026-10-01T00:00:00Z' }).success).toBe(false)
  })

  it('preserves valid sub-millisecond date ranges supported by PostgreSQL', () => {
    expect(notebookSearchInputSchema.safeParse({ query: 'plan', created_after: '2026-10-01T00:00:00.000001Z', created_before: '2026-10-01T00:00:00.000002Z' }).success).toBe(true)
  })
  it('returns validation errors for malformed timestamps instead of throwing during range comparison', () => {
    expect(notebookSearchInputSchema.safeParse({ query: 'plan', created_after: 'invalid', created_before: '2026-11-01T00:00:00Z' }).success).toBe(false)
  })

})
