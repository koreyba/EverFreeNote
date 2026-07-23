# Test Result

- Name: renders with default props
- Full Name: everfreenote:cypress/component/editor/Textarea.cy.tsx#Textarea Component renders with default props
- Environment: default
- History ID: c579ab9c7d361dabb3da1f837ae8ed5c.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: dd710831ce573c8e8493967a422e351c
- Status: PASSED
- Duration: 123ms
- Started: 2026-07-23T13:31:22.098Z
- Stopped: 2026-07-23T13:31:22.221Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / editor / Textarea.cy.tsx / Textarea Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: Textarea Component
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.editor.Textarea.cy.tsx
- \_fallbackTestCaseId: 059f4c80999b59dd8f81f851a612ed91

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
- Duration: 123ms
- Started: 2026-07-23T13:31:22.098Z
- Stopped: 2026-07-23T13:31:22.221Z
- Steps Recorded: 9
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 46ms
- Started: 2026-07-23T13:31:22.098Z
- Stopped: 2026-07-23T13:31:22.144Z

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
- [PASSED] get textarea (44ms)
  - Parameters: Selector=textarea, Yielded=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>, Elements=1
  - [PASSED] assert expected textarea to be visible (35ms)
    - Parameters: subject=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>
- [PASSED] get textarea (4ms)
  - Parameters: Selector=textarea, Yielded=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>, Elements=1
  - [PASSED] assert expected \<textarea.flex.min-h-\[60px\].w-full.rounded-md.border.border-input.bg-transparent.px-3.py-2.text-base.shadow-sm.placeholder:text-muted-foreground.focus-visible:outline-none.focus-visible:ring-1.focus-visible:ring-ring.disabled:cursor-not-allowed.disabled:opacity-50.md:text-sm\> to have attribute placeholder with the value Enter text here (0s)
    - Parameters: actual=Enter text here, expected=Enter text here, subject=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>
- [PASSED] get textarea (3ms)
  - Parameters: Selector=textarea, Yielded=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>, Elements=1
  - [PASSED] assert expected \<textarea.flex.min-h-\[60px\].w-full.rounded-md.border.border-input.bg-transparent.px-3.py-2.text-base.shadow-sm.placeholder:text-muted-foreground.focus-visible:outline-none.focus-visible:ring-1.focus-visible:ring-ring.disabled:cursor-not-allowed.disabled:opacity-50.md:text-sm\> to have class flex (0s)
    - Parameters: subject=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>
- [PASSED] get textarea (2ms)
  - Parameters: Selector=textarea, Yielded=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>, Elements=1
  - [PASSED] assert expected \<textarea.flex.min-h-\[60px\].w-full.rounded-md.border.border-input.bg-transparent.px-3.py-2.text-base.shadow-sm.placeholder:text-muted-foreground.focus-visible:outline-none.focus-visible:ring-1.focus-visible:ring-ring.disabled:cursor-not-allowed.disabled:opacity-50.md:text-sm\> to have class min-h-\[60px\] (0s)
    - Parameters: subject=<textarea class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" placeholder="Enter text here"></textarea>
