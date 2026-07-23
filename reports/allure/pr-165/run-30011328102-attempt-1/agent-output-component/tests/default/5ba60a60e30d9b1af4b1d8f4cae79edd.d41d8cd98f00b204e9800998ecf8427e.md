# Test Result

- Name: preserves ordered list structure
- Full Name: everfreenote:cypress/component/editor/RichTextEditorPaste.cy.tsx#RichTextEditor – Smart Paste block paste – multi-element HTML preserves structure preserves ordered list structure
- Environment: default
- History ID: 5ba60a60e30d9b1af4b1d8f4cae79edd.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: ed2bd0caf5ab13b728d9763a889e6af8
- Status: PASSED
- Duration: 204ms
- Started: 2026-07-23T13:31:13.299Z
- Stopped: 2026-07-23T13:31:13.503Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditorPaste.cy.tsx / RichTextEditor – Smart Paste / block paste – multi-element HTML preserves structure

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditor – Smart Paste
- suite: block paste – multi-element HTML preserves structure
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditorPaste.cy.tsx
- \_fallbackTestCaseId: 4e4fdb72a1028326807d18eb68b540a7

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
- Duration: 204ms
- Started: 2026-07-23T13:31:13.299Z
- Stopped: 2026-07-23T13:31:13.503Z
- Steps Recorded: 10
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 18ms
- Started: 2026-07-23T13:31:13.304Z
- Stopped: 2026-07-23T13:31:13.322Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get \[data-cy="editor-content"\] (75ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] click (71ms)
  - Parameters: Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1, Coords={"x":640,"y":99}, Actual Element Clicked=<p>...</p>
- [PASSED] get .ProseMirror (1ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] get .ProseMirror (1ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] find ol (3ms)
  - Parameters: Selector=ol, Applied To=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Yielded=<ol>...</ol>, Elements=1
  - [PASSED] assert expected \<ol\> to exist in the DOM (0s)
    - Parameters: actual=<ol>, expected=<ol>, subject=<ol>...</ol>
- [PASSED] get .ProseMirror (0s)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Elements=1
- [PASSED] find li (2ms)
  - Parameters: Selector=li, Applied To=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none ProseMirror-focused" tabindex="0">...</div>, Yielded=[{"pmViewDesc":{"dirty":0}},{"pmViewDesc":{"dirty":0}}], Elements=2
  - [PASSED] assert expected \[ \<li\>, 1 more... \] to have a length of 2 (0s)
    - Parameters: actual=2, expected=2, subject=<li>...</li>
