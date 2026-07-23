# Test Result

- Name: preserves bold formatting when a bold paragraph is pasted back in place
- Full Name: everfreenote:cypress/component/editor/RichTextEditorPaste.cy.tsx#RichTextEditor – Smart Paste comprehensive formatting preservation on paste-in-place preserves bold formatting when a bold paragraph is pasted back in place
- Environment: default
- History ID: 0bd3ccaef6cc62d9c94cdaf7e10759c8.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 83f74bb683890869df74f6ff11693809
- Status: PASSED
- Duration: 325ms
- Started: 2026-07-23T13:44:24.169Z
- Stopped: 2026-07-23T13:44:24.494Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditorPaste.cy.tsx / RichTextEditor – Smart Paste / comprehensive formatting preservation on paste-in-place

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditor – Smart Paste
- suite: comprehensive formatting preservation on paste-in-place
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditorPaste.cy.tsx
- \_fallbackTestCaseId: 11adcce6fe308201812fdaed41b0ed0f

## Parameters

- Retry: 2 (excluded)

## Links

None

## Expectation Comparison

- Scope Match: unknown
- Match Reasons: None
- Expected References: None
- Metadata Mismatches: None

## Attachments Manifest

None

## Quality Findings

None

## Current Attempt

- Status: PASSED
- Duration: 325ms
- Started: 2026-07-23T13:44:24.169Z
- Stopped: 2026-07-23T13:44:24.494Z
- Steps Recorded: 14
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 14ms
- Started: 2026-07-23T13:44:24.169Z
- Stopped: 2026-07-23T13:44:24.183Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (1ms)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get \[data-cy="editor-content"\] (82ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] click (70ms)
  - Parameters: Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1, Coords={"x":640,"y":99}, Actual Element Clicked=<p>...</p>
- [PASSED] get .ProseMirror (0s)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] type {selectall} (94ms)
  - Parameters: Typed={selectall}, Applied To=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>
- [PASSED] get .ProseMirror (1ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] get .ProseMirror (0s)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] find p (2ms)
  - Parameters: Selector=p, Applied To=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Yielded=<p>...</p>, Elements=1
  - [PASSED] assert expected \<p\> to have a length of 1 (0s)
    - Parameters: actual=1, expected=1, subject=<p>...</p>
- [PASSED] get .ProseMirror strong (4ms)
  - Parameters: Selector=.ProseMirror strong, Yielded=<strong>bold</strong>, Elements=1
  - [PASSED] assert expected \<strong\> to exist in the DOM (1ms)
    - Parameters: actual=<strong>, expected=<strong>, subject=<strong>bold</strong>
  - [PASSED] assert expected \<strong\> to contain text bold (0s)
    - Parameters: actual=bold, expected=bold, subject=<strong>bold</strong>
- [PASSED] get .ProseMirror p (2ms)
  - Parameters: Selector=.ProseMirror p, Yielded=<p>...</p>, Elements=1
  - [PASSED] assert expected \<p\> to contain text Normal bold text (0s)
    - Parameters: actual=Normal bold text, expected=Normal bold text, subject=<p>...</p>
