# Test Result

- Name: preserves list when entire list is pasted back in place
- Full Name: everfreenote:cypress/component/editor/RichTextEditorPaste.cy.tsx#RichTextEditor – Smart Paste comprehensive formatting preservation on paste-in-place preserves list when entire list is pasted back in place
- Environment: default
- History ID: d4ceda3aa0df3d84cd9f8e43f24b7ecd.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: d5ef76c7dd079f16840e0121057fc041
- Status: PASSED
- Duration: 270ms
- Started: 2026-07-23T13:44:24.519Z
- Stopped: 2026-07-23T13:44:24.789Z
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
- \_fallbackTestCaseId: f86c3ec584f2ad77a5261dbdf4833eac

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
- Duration: 270ms
- Started: 2026-07-23T13:44:24.519Z
- Stopped: 2026-07-23T13:44:24.789Z
- Steps Recorded: 16
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 15ms
- Started: 2026-07-23T13:44:24.520Z
- Stopped: 2026-07-23T13:44:24.535Z

#### Error

None

#### Steps

- [PASSED] window (1ms)
  - Parameters: Yielded=<window>

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get \[data-cy="editor-content"\] (40ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] click (72ms)
  - Parameters: Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1, Coords={"x":640,"y":133}, Actual Element Clicked=<p>Beta</p>
- [PASSED] get .ProseMirror (0s)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] type {selectall} (70ms)
  - Parameters: Typed={selectall}, Applied To=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>
- [PASSED] get .ProseMirror (0s)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] get .ProseMirror ul (2ms)
  - Parameters: Selector=.ProseMirror ul, Yielded=[{"pmViewDesc":{"dirty":0}},{"pmViewDesc":{"dirty":0}}], Elements=2
  - [PASSED] assert expected \[ \<ul\>, 1 more... \] to exist in the DOM (0s)
    - Parameters: actual=[ <ul>, 1 more... ], expected=[ <ul>, 1 more... ], subject=<ul>...</ul>
- [PASSED] get .ProseMirror li (8ms)
  - Parameters: Selector=.ProseMirror li, Yielded=[{"pmViewDesc":{"dirty":0}},{"pmViewDesc":{"dirty":0}},{"pmViewDesc":{"dirty":0}},{"pmViewDesc":{"dirty":0}}], Elements=4
  - [PASSED] assert expected \[ \<li\>, 3 more... \] to have property length (3ms)
    - Parameters: subject=<li>...</li>
- [PASSED] get .ProseMirror (2ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
  - [PASSED] assert expected \<div.tiptap.ProseMirror.focus:outline-none.ProseMirror-focused\> to contain text Alpha (0s)
    - Parameters: subject=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>
- [PASSED] get .ProseMirror (2ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
  - [PASSED] assert expected \<div.tiptap.ProseMirror.focus:outline-none.ProseMirror-focused\> to contain text Beta (0s)
    - Parameters: subject=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>
- [PASSED] get .ProseMirror (2ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
  - [PASSED] assert expected \<div.tiptap.ProseMirror.focus:outline-none.ProseMirror-focused\> to contain text Gamma (0s)
    - Parameters: subject=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>
