# Test Result

- Name: closes progress dialog
- Full Name: everfreenote:cypress/component/ui/ImportButton.cy.tsx#ImportButton closes progress dialog
- Environment: default
- History ID: cb1f63efb6b6ebe801b05fdc2630deaf.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 138502121823a37fe82f83e484bf74eb
- Status: PASSED
- Duration: 345ms
- Started: 2026-07-23T13:32:14.321Z
- Stopped: 2026-07-23T13:32:14.666Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / ImportButton.cy.tsx / ImportButton

## Labels

- language: javascript
- framework: cypress
- parentSuite: ImportButton
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.ui.ImportButton.cy.tsx
- \_fallbackTestCaseId: 38d36fe6a7ef0fad73a7a52ec04ecc17

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
- Duration: 345ms
- Started: 2026-07-23T13:32:14.321Z
- Stopped: 2026-07-23T13:32:14.666Z
- Steps Recorded: 14
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 5ms
- Started: 2026-07-23T13:32:14.334Z
- Stopped: 2026-07-23T13:32:14.339Z

#### Error

None

#### Steps

- No steps

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 13ms
- Started: 2026-07-23T13:32:14.321Z
- Stopped: 2026-07-23T13:32:14.334Z

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
- [PASSED] contains Import .enex file (19ms)
  - Parameters: Content=Import .enex file, Applied To=<body style="">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">...</button>, Elements=1
- [PASSED] click (88ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">...</button>, Elements=1, Coords={"x":75,"y":24}
- [PASSED] get input\[type="file"\] (0s)
  - Parameters: Selector=input[type="file"], Yielded=<input multiple="" accept=".enex" aria-label="Upload ENEX file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file">, Elements=1
- [PASSED] selectFile Object{3}, {force: true} (15ms)
  - Parameters: Target=<input multiple="" accept=".enex" aria-label="Upload ENEX file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file">, Elements=1
- [PASSED] get \[role="dialog"\] button (3ms)
  - Parameters: Selector=[role="dialog"] button, Yielded=[{},{},{},{},{},{},{},{}], Elements=8
- [PASSED] contains Import (1ms)
  - Parameters: Content=Import, Applied To=[{},{},{},{},{},{},{},{}], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-full shadow-sm" disabled="">Import</button>, Elements=1
- [PASSED] click (96ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-full shadow-sm" disabled="">Import</button>, Elements=1, Coords={"x":102,"y":441}
- [PASSED] contains Successfully imported 1 note (3ms)
  - Parameters: Content=Successfully imported 1 note, Applied To=<body style="">...</body>, Yielded=<p class="text-sm text-muted-foreground text-center">Success...</p>, Elements=1
- [PASSED] assert expected \<p.text-sm.text-muted-foreground.text-center\> to be visible (0s)
  - Parameters: subject=<p class="text-sm text-muted-foreground text-center">Success...</p>
- [PASSED] contains button, Close (0s)
  - Parameters: Content=Close, Applied To=<body style="">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full rounded-full shadow-sm">Close</button>, Elements=1
- [PASSED] click (78ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full rounded-full shadow-sm">Close</button>, Elements=1, Coords={"x":33,"y":277}
- [PASSED] contains Import Progress (1ms)
  - Parameters: Content=Import Progress, Applied To=<body style="">...</body>, Elements=0
- [PASSED] assert expected undefined not to exist in the DOM (0s)
