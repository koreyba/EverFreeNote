# Test Result

- Name: escapes raw HTML tags in plain text
- Full Name: everfreenote:cypress/component/editor/RichTextEditorWebViewPaste.cy.tsx#RichTextEditorWebView – Smart Paste plain text paste escapes raw HTML tags in plain text
- Environment: default
- History ID: 1ed83ebcd78df3b3a235fa93fccc0e4f.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 95659f7760492457a92ef0915fc6a44a
- Status: PASSED
- Duration: 42ms
- Started: 2026-07-23T13:44:29.460Z
- Stopped: 2026-07-23T13:44:29.502Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditorWebViewPaste.cy.tsx / RichTextEditorWebView – Smart Paste / plain text paste

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditorWebView – Smart Paste
- suite: plain text paste
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditorWebViewPaste.cy.tsx
- \_fallbackTestCaseId: dc70d961e7ad44efc44dac3649cb6419

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
- Duration: 42ms
- Started: 2026-07-23T13:44:29.460Z
- Stopped: 2026-07-23T13:44:29.502Z
- Steps Recorded: 6
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 11ms
- Started: 2026-07-23T13:44:29.461Z
- Stopped: 2026-07-23T13:44:29.472Z

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
- [PASSED] get .ProseMirror (17ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none" tabindex="0">...</div>, Elements=1
- [PASSED] get .ProseMirror (2ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none" tabindex="0">...</div>, Elements=1
  - [PASSED] assert expected \<div.tiptap.ProseMirror.focus:outline-none\> not to contain HTML \<script\> (0s)
    - Parameters: subject=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none" tabindex="0">...</div>
- [PASSED] get .ProseMirror (1ms)
  - Parameters: Selector=.ProseMirror, Yielded=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none" tabindex="0">...</div>, Elements=1
  - [PASSED] assert expected \<div.tiptap.ProseMirror.focus:outline-none\> to contain text safe text (0s)
    - Parameters: subject=<div contenteditable="true" spellcheck="true" translate="no" class="tiptap ProseMirror focus:outline-none" tabindex="0">...</div>
