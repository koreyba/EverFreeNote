# Test Result

- Name: renders with initial content
- Full Name: everfreenote:cypress/component/editor/RichTextEditor.rendering.cy.tsx#RichTextEditor Component renders with initial content
- Environment: default
- History ID: faf2145d5ada2be87a3f89c8bab1f9d7.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 99dcb70fb797eb3a7f254b150538f350
- Status: PASSED
- Duration: 151ms
- Started: 2026-07-23T13:30:55.745Z
- Stopped: 2026-07-23T13:30:55.896Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditor.rendering.cy.tsx / RichTextEditor Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditor Component
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditor.rendering.cy.tsx
- \_fallbackTestCaseId: ad1316054b8e9d4a5c34286949eeb113

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
- Duration: 151ms
- Started: 2026-07-23T13:30:55.745Z
- Stopped: 2026-07-23T13:30:55.896Z
- Steps Recorded: 5
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 14ms
- Started: 2026-07-23T13:30:55.747Z
- Stopped: 2026-07-23T13:30:55.761Z

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
- [PASSED] get \[data-cy="editor-content"\] (126ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
  - [PASSED] assert expected \<div.note-content.min-h-\[400px\].px-6.py-4\> to contain Hello World (0s)
    - Parameters: subject=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>
- [PASSED] get @onContentChangeSpy (0s)
  - Parameters: Alias=@onContentChangeSpy, Yielded=onContentChangeSpy
  - [PASSED] assert expected onContentChangeSpy to not have been called at least once (0s)
    - Parameters: actual=onContentChangeSpy
