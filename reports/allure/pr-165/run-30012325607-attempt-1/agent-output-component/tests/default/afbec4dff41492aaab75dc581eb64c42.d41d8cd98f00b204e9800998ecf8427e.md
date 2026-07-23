# Test Result

- Name: opens dialog on click
- Full Name: everfreenote:cypress/component/ui/ExportButton.cy.tsx#ExportButton opens dialog on click
- Environment: default
- History ID: afbec4dff41492aaab75dc581eb64c42.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 5efd19eae57f695844c553c90c3e01ce
- Status: PASSED
- Duration: 163ms
- Started: 2026-07-23T13:45:08.185Z
- Stopped: 2026-07-23T13:45:08.348Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / ExportButton.cy.tsx / ExportButton

## Labels

- language: javascript
- framework: cypress
- parentSuite: ExportButton
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.ExportButton.cy.tsx
- \_fallbackTestCaseId: fc210900705135003cdfce584da8c607

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
- Duration: 163ms
- Started: 2026-07-23T13:45:08.185Z
- Stopped: 2026-07-23T13:45:08.348Z
- Steps Recorded: 5
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 17ms
- Started: 2026-07-23T13:45:08.186Z
- Stopped: 2026-07-23T13:45:08.203Z

#### Error

None

#### Steps

- [PASSED] window (1ms)
  - Parameters: Yielded=<window>

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 2ms
- Started: 2026-07-23T13:45:08.204Z
- Stopped: 2026-07-23T13:45:08.206Z

#### Error

None

#### Steps

- No steps

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] contains button, Export .enex file (20ms)
  - Parameters: Content=Export .enex file, Applied To=<body data-scroll-locked="1" style="pointer-events: none;">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">...</button>, Elements=1
- [PASSED] click (108ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">...</button>, Elements=1, Coords={"x":75,"y":24}
- [PASSED] contains Export notes to .enex (4ms)
  - Parameters: Content=Export notes to .enex, Applied To=<body data-scroll-locked="1" style="pointer-events: none;">...</body>, Yielded=<h2 id="radix-_r_7_" class="text-lg font-semibold leading-none tracking-tight">Export ...</h2>, Elements=1
- [PASSED] assert expected \<h2#radix-\_r\_7\_.text-lg.font-semibold.leading-none.tracking-tight\> to be visible (0s)
  - Parameters: subject=<h2 id="radix-_r_7_" class="text-lg font-semibold leading-none tracking-tight">Export ...</h2>
