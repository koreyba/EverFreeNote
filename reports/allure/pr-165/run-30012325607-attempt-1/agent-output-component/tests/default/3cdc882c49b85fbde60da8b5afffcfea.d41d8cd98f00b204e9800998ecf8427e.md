# Test Result

- Name: does not show WordPress export in menu when not configured
- Full Name: everfreenote:cypress/component/features/notes/NoteView.cy.tsx#NoteView Component does not show WordPress export in menu when not configured
- Environment: default
- History ID: 3cdc882c49b85fbde60da8b5afffcfea.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: ba7a5076d6adc4497e916b34b3e969eb
- Status: PASSED
- Duration: 133ms
- Started: 2026-07-23T13:47:16.231Z
- Stopped: 2026-07-23T13:47:16.364Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / notes / NoteView.cy.tsx / NoteView Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: NoteView Component
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.features.notes.NoteView.cy.tsx
- \_fallbackTestCaseId: c79907a13306456e6eb5c6301a89da33

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
- Duration: 133ms
- Started: 2026-07-23T13:47:16.231Z
- Stopped: 2026-07-23T13:47:16.364Z
- Steps Recorded: 5
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 13ms
- Started: 2026-07-23T13:47:16.231Z
- Stopped: 2026-07-23T13:47:16.244Z

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
- [PASSED] get button\[aria-label="More actions"\] (18ms)
  - Parameters: Selector=button[aria-label="More actions"], Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9" aria-label="More actions" type="button" id="radix-_r_1v_" aria-haspopup="menu" aria-expanded="true" data-state="open" aria-controls="radix-_r_20_">...</button>, Elements=1
- [PASSED] click (88ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9" aria-label="More actions" type="button" id="radix-_r_1v_" aria-haspopup="menu" aria-expanded="true" data-state="open" aria-controls="radix-_r_20_">...</button>, Elements=1, Coords={"x":240,"y":83}, Actual Element Clicked=<circle cx="12" cy="12" r="1"></circle>
- [PASSED] contains \[role="menuitem"\], Export to WP (2ms)
  - Parameters: Content=Export to WP, Applied To=<body style="">...</body>, Elements=0
- [PASSED] assert expected undefined not to exist in the DOM (0s)
