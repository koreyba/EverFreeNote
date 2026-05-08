import {
  EVERFREENOTE_COPY_ATTRIBUTE,
  EVERFREENOTE_COPY_KIND,
  NoteCopyService,
} from '@core/services/noteCopy'

describe('core/services/noteCopy', () => {
  it('wraps sanitized note HTML with the EverFreeNote self-copy marker', () => {
    const payload = NoteCopyService.buildPayload('<p>Hello <strong>world</strong></p>')

    expect(payload.html).toContain(`${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"`)
    expect(payload.html).toContain('<p>Hello <strong>world</strong></p>')
  })

  it('builds readable plain text with preserved paragraph spacing', () => {
    const payload = NoteCopyService.buildPayload('<h2>Title</h2><p>First line<br />Second line</p><p>Next block</p>')

    expect(payload.text).toBe('Title\n\nFirst line\nSecond line\n\nNext block')
  })

  it('preserves task-list metadata needed for EverFreeNote round-trip', () => {
    const payload = NoteCopyService.buildPayload(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input checked="checked" disabled="disabled" type="checkbox"><span></span></label><div><p>Done</p></div></li></ul>',
    )

    expect(payload.html).toContain('data-type="taskList"')
    expect(payload.html).toContain('data-checked="true"')
    expect(payload.html).toContain('<input')
    expect(payload.html).toContain('type="checkbox"')
    expect(payload.text).toContain('[x] Done')
  })
})
