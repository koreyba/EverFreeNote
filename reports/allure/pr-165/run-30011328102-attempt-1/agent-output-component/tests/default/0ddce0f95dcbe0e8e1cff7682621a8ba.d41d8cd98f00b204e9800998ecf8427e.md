# Test Result

- Name: applies strikethrough formatting
- Full Name: everfreenote:cypress/component/editor/RichTextEditor.formatting.cy.tsx#RichTextEditor Component applies strikethrough formatting
- Environment: default
- History ID: 0ddce0f95dcbe0e8e1cff7682621a8ba.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 879eac72da739d3d8b4ab0392fbf8946
- Status: PASSED
- Duration: 668ms
- Started: 2026-07-23T13:30:34.428Z
- Stopped: 2026-07-23T13:30:35.096Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditor.formatting.cy.tsx / RichTextEditor Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditor Component
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditor.formatting.cy.tsx
- \_fallbackTestCaseId: 14dab81834c2adce406c0919c44c6596

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
- Duration: 668ms
- Started: 2026-07-23T13:30:34.428Z
- Stopped: 2026-07-23T13:30:35.096Z
- Steps Recorded: 14
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 16ms
- Started: 2026-07-23T13:30:34.429Z
- Stopped: 2026-07-23T13:30:34.445Z

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
- [PASSED] get \[data-cy="editor-content"\] (93ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] click (72ms)
  - Parameters: Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1, Coords={"x":640,"y":99}, Actual Element Clicked=<p>...</p>
- [PASSED] get \[data-cy="editor-content"\] (1ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] type Hello World (266ms)
  - Parameters: Typed=Hello World, Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>
- [PASSED] get \[data-cy="editor-content"\] (1ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] type {selectall} (121ms)
  - Parameters: Typed={selectall}, Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>
- [PASSED] get \[data-cy="strike-button"\] (1ms)
  - Parameters: Selector=[data-cy="strike-button"], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="strike-button" aria-label="Strikethrough" data-state="closed">...</button>, Elements=1
- [PASSED] click (74ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="strike-button" aria-label="Strikethrough" data-state="closed">...</button>, Elements=1, Coords={"x":148,"y":57}, Actual Element Clicked=<line x1="4" x2="20" y1="12" y2="12"></line>
- [PASSED] get @onContentChangeSpy (1ms)
  - Parameters: Alias=@onContentChangeSpy, Yielded=onContentChangeSpy
  - [PASSED] assert expected onContentChangeSpy to have been called at least once (0s)
    - Parameters: actual=onContentChangeSpy
- [PASSED] get \[data-cy="editor-content"\] (0s)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] find s (2ms)
  - Parameters: Selector=s, Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Yielded=<s>Hello W...</s>, Elements=1
  - [PASSED] assert expected \<s\> to contain Hello World (0s)
    - Parameters: subject=<s>Hello W...</s>
