# Test Result

- Name: applies provided value to indicator transform
- Full Name: everfreenote:cypress/component/ui/Progress.cy.tsx#Progress Component applies provided value to indicator transform
- Environment: default
- History ID: d31cf2700aea1f52c41deda2ce195adb.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: f939fcb3fcd3bb542e7f37027500365f
- Status: PASSED
- Duration: 49ms
- Started: 2026-07-23T13:45:31.401Z
- Stopped: 2026-07-23T13:45:31.450Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / Progress.cy.tsx / Progress Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: Progress Component
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.Progress.cy.tsx
- \_fallbackTestCaseId: bfa854bb7174508fc9dd0522261425ff

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
- Duration: 49ms
- Started: 2026-07-23T13:45:31.401Z
- Stopped: 2026-07-23T13:45:31.450Z
- Steps Recorded: 4
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 16ms
- Started: 2026-07-23T13:45:31.405Z
- Stopped: 2026-07-23T13:45:31.421Z

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
- [PASSED] get \[role="progressbar"\] \[data-state\] (20ms)
  - Parameters: Selector=[role="progressbar"] [data-state], Yielded=<div data-state="indeterminate" data-max="100" class="h-full w-full flex-1 bg-primary transition-all" style="transform: translateX(-50%);"></div>, Elements=1
  - [PASSED] assert expected \[role="progressbar"\] \[data-state\] to have attribute style (21ms)
    - Parameters: subject=<div data-state="indeterminate" data-max="100" class="h-full w-full flex-1 bg-primary transition-all" style="transform: translateX(-50%);"></div>
  - [PASSED] assert expected transform: translateX(-50%); to include translateX(-50% (0s)
    - Parameters: actual=transform: translateX(-50%);
