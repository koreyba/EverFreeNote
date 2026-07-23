# Test Result

- Name: undo button has correct tooltip text
- Full Name: everfreenote:cypress/component/editor/RichTextEditor.history.cy.tsx#RichTextEditor Component Undo/Redo buttons undo button has correct tooltip text
- Environment: default
- History ID: ee2db26f039d9cafe0e7aa8cea52aff9.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: c49f49f6d892e9e7b85267719690e7de
- Status: PASSED
- Duration: 556ms
- Started: 2026-07-23T13:44:01.621Z
- Stopped: 2026-07-23T13:44:02.177Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / RichTextEditor.history.cy.tsx / RichTextEditor Component / Undo/Redo buttons

## Labels

- language: javascript
- framework: cypress
- parentSuite: RichTextEditor Component
- suite: Undo/Redo buttons
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.editor.RichTextEditor.history.cy.tsx
- \_fallbackTestCaseId: 1915922a1a6eaa329d928a6dced81940

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
- Duration: 556ms
- Started: 2026-07-23T13:44:01.621Z
- Stopped: 2026-07-23T13:44:02.177Z
- Steps Recorded: 15
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 10ms
- Started: 2026-07-23T13:44:01.624Z
- Stopped: 2026-07-23T13:44:01.634Z

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
- [PASSED] get \[data-cy="editor-content"\] (85ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] click (70ms)
  - Parameters: Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1, Coords={"x":640,"y":99}, Actual Element Clicked=<p>...</p>
- [PASSED] get \[data-cy="editor-content"\] (1ms)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] type Hello (160ms)
  - Parameters: Typed=Hello, Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>
- [PASSED] get \[data-cy="editor-content"\] (0s)
  - Parameters: Selector=[data-cy="editor-content"], Yielded=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>, Elements=1
- [PASSED] type {selectall} (115ms)
  - Parameters: Typed={selectall}, Applied To=<div data-cy="editor-content" class="note-content min-h-[400px] px-6 py-4">...</div>
- [PASSED] get \[data-cy="bold-button"\] (0s)
  - Parameters: Selector=[data-cy="bold-button"], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="bold-button" aria-label="Bold (Ctrl+B)" data-state="closed">...</button>, Elements=1
- [PASSED] click (72ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="bold-button" aria-label="Bold (Ctrl+B)" data-state="closed">...</button>, Elements=1, Coords={"x":28,"y":57}, Actual Element Clicked=<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"></path>
- [PASSED] get \[data-cy="undo-button"\] (2ms)
  - Parameters: Selector=[data-cy="undo-button"], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="undo-button" aria-label="Undo" data-state="instant-open" aria-describedby="radix-_r_bo_">...</button>, Elements=1
  - [PASSED] assert expected \<button.inline-flex.items-center.justify-center.gap-2.whitespace-nowrap.text-sm.font-medium.focus-visible:outline-none.focus-visible:ring-1.focus-visible:ring-ring.disabled:pointer-events-none.disabled:opacity-50.\[&\_svg\]:pointer-events-none.\[&\_svg\]:size-4.\[&\_svg\]:shrink-0.cursor-pointer.hover:text-accent-foreground.h-8.w-8.p-0.rounded-lg.active:scale-90.hover:bg-muted.transition-all.duration-100.ease-out.shrink-0\> not to be disabled (0s)
    - Parameters: subject=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="undo-button" aria-label="Undo" data-state="instant-open" aria-describedby="radix-_r_bo_">...</button>
- [PASSED] get \[data-cy="undo-button"\] (0s)
  - Parameters: Selector=[data-cy="undo-button"], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="undo-button" aria-label="Undo" data-state="instant-open" aria-describedby="radix-_r_bo_">...</button>, Elements=1
- [PASSED] focus (1ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:text-accent-foreground h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0" data-cy="undo-button" aria-label="Undo" data-state="instant-open" aria-describedby="radix-_r_bo_">...</button>
- [PASSED] get \[role="tooltip"\] (20ms)
  - Parameters: Selector=[role="tooltip"], Yielded=<span id="radix-_r_bo_" role="tooltip" style="position: absolute; border: 0px; width: 1px; height: 1px; padding: 0px; margin: -1px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; overflow-wrap: normal;">Undo (C...</span>, Elements=1
  - [PASSED] assert expected \<span#radix-\_r\_bo\_\> to contain Undo (Ctrl+Z) (0s)
    - Parameters: subject=<span id="radix-_r_bo_" role="tooltip" style="position: absolute; border: 0px; width: 1px; height: 1px; padding: 0px; margin: -1px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; overflow-wrap: normal;">Undo (C...</span>
