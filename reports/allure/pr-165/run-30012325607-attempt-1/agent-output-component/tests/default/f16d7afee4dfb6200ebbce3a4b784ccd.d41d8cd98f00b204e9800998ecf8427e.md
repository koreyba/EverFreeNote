# Test Result

- Name: filters notes by search
- Full Name: everfreenote:cypress/component/ui/ExportSelectionDialog.cy.tsx#ExportSelectionDialog filters notes by search
- Environment: default
- History ID: f16d7afee4dfb6200ebbce3a4b784ccd.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 61b3bd3585034cf778c907dc00945d2a
- Status: PASSED
- Duration: 212ms
- Started: 2026-07-23T13:45:15.670Z
- Stopped: 2026-07-23T13:45:15.882Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / ExportSelectionDialog.cy.tsx / ExportSelectionDialog

## Labels

- language: javascript
- framework: cypress
- parentSuite: ExportSelectionDialog
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.ExportSelectionDialog.cy.tsx
- \_fallbackTestCaseId: cbbabf96a3237a4f06c8b8357e44b289

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
- Duration: 212ms
- Started: 2026-07-23T13:45:15.670Z
- Stopped: 2026-07-23T13:45:15.882Z
- Steps Recorded: 7
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 13ms
- Started: 2026-07-23T13:45:15.672Z
- Stopped: 2026-07-23T13:45:15.685Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 1ms
- Started: 2026-07-23T13:45:15.685Z
- Stopped: 2026-07-23T13:45:15.686Z

#### Error

None

#### Steps

- No steps

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get input\[placeholder\*="Search"\] (29ms)
  - Parameters: Selector=input[placeholder*="Search"], Yielded=<input placeholder="Search by title or text" class="w-full rounded-full border border-border/40 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 shadow-sm" type="text" value="Apple">, Elements=1
- [PASSED] type Apple (151ms)
  - Parameters: Typed=Apple, Applied To=<input placeholder="Search by title or text" class="w-full rounded-full border border-border/40 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 shadow-sm" type="text" value="Apple">
- [PASSED] contains Apple (4ms)
  - Parameters: Content=Apple, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<label class="w-full text-left flex items-center gap-3 rounded-xl border p-2 transition-colors cursor-pointer border-border/30 hover:bg-muted/30">...</label>, Elements=1
- [PASSED] assert expected \<label.w-full.text-left.flex.items-center.gap-3.rounded-xl.border.p-2.transition-colors.cursor-pointer.border-border/30.hover:bg-muted/30\> to be visible (1ms)
  - Parameters: subject=<label class="w-full text-left flex items-center gap-3 rounded-xl border p-2 transition-colors cursor-pointer border-border/30 hover:bg-muted/30">...</label>
- [PASSED] contains Banana (1ms)
  - Parameters: Content=Banana, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Elements=0
- [PASSED] assert expected undefined not to exist in the DOM (0s)
