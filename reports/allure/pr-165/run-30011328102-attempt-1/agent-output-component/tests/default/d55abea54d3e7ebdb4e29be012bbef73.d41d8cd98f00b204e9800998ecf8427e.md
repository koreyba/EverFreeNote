# Test Result

- Name: renders multiple skeleton items with consistent structure
- Full Name: everfreenote:cypress/component/core/NoteListSkeleton.cy.tsx#NoteListSkeleton Component renders multiple skeleton items with consistent structure
- Environment: default
- History ID: d55abea54d3e7ebdb4e29be012bbef73.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: b2b3cab921d6e73ceebd0a18f90589e2
- Status: PASSED
- Duration: 62ms
- Started: 2026-07-23T13:30:01.580Z
- Stopped: 2026-07-23T13:30:01.642Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / core / NoteListSkeleton.cy.tsx / NoteListSkeleton Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: NoteListSkeleton Component
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.core.NoteListSkeleton.cy.tsx
- \_fallbackTestCaseId: 472db44f7b3fdff315bc2077eb3c3af1

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
- Duration: 62ms
- Started: 2026-07-23T13:30:01.580Z
- Stopped: 2026-07-23T13:30:01.642Z
- Steps Recorded: 11
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 16ms
- Started: 2026-07-23T13:30:01.582Z
- Stopped: 2026-07-23T13:30:01.598Z

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
- [PASSED] get div.space-y-1 \> div (19ms)
  - Parameters: Selector=div.space-y-1 > div, Yielded=[{"__reactFiber$j6ox7j6d6w":{"tag":5,"key":"0","elementType":"div","type":"div","index":0,"ref":null,"refCleanup":null,"updateQu..., Elements=3
- [PASSED] wrap \<div.p-3.rounded-lg.border.border-transparent\> (1ms)
  - Parameters: Yielded=<div class="p-3 rounded-lg border border-transparent">...</div>
- [PASSED] find \[class\*="animate-pulse"\] (3ms)
  - Parameters: Selector=[class*="animate-pulse"], Applied To=<div class="p-3 rounded-lg border border-transparent">...</div>, Yielded=[{"__reactFiber$j6ox7j6d6w":{"tag":5,"key":null,"elementType":"div","type":"div","child":null,"sibling":null,"index":0,"ref":nul..., Elements=5
  - [PASSED] assert expected \[ \<div.animate-pulse.rounded-md.bg-primary/10.h-5.w-3/4.mb-2\>, 4 more... \] to have property length (0s)
    - Parameters: subject=<div class="animate-pulse rounded-md bg-primary/10 h-5 w-3/4 mb-2"></div>
- [PASSED] wrap \<div.p-3.rounded-lg.border.border-transparent\> (0s)
  - Parameters: Yielded=<div class="p-3 rounded-lg border border-transparent">...</div>
- [PASSED] find \[class\*="animate-pulse"\] (2ms)
  - Parameters: Selector=[class*="animate-pulse"], Applied To=<div class="p-3 rounded-lg border border-transparent">...</div>, Yielded=[{"__reactFiber$j6ox7j6d6w":{"tag":5,"key":null,"elementType":"div","type":"div","child":null,"sibling":null,"index":0,"ref":nul..., Elements=5
  - [PASSED] assert expected \[ \<div.animate-pulse.rounded-md.bg-primary/10.h-5.w-3/4.mb-2\>, 4 more... \] to have property length (1ms)
    - Parameters: subject=<div class="animate-pulse rounded-md bg-primary/10 h-5 w-3/4 mb-2"></div>
- [PASSED] wrap \<div.p-3.rounded-lg.border.border-transparent\> (0s)
  - Parameters: Yielded=<div class="p-3 rounded-lg border border-transparent">...</div>
- [PASSED] find \[class\*="animate-pulse"\] (0s)
  - Parameters: Selector=[class*="animate-pulse"], Applied To=<div class="p-3 rounded-lg border border-transparent">...</div>, Yielded=[{"__reactFiber$j6ox7j6d6w":{"tag":5,"key":null,"elementType":"div","type":"div","child":null,"sibling":null,"index":0,"ref":nul..., Elements=5
  - [PASSED] assert expected \[ \<div.animate-pulse.rounded-md.bg-primary/10.h-5.w-3/4.mb-2\>, 4 more... \] to have property length (0s)
    - Parameters: subject=<div class="animate-pulse rounded-md bg-primary/10 h-5 w-3/4 mb-2"></div>
