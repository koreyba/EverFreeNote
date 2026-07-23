# Test Result

- Name: prevents switching when tabs are disabled
- Full Name: everfreenote:cypress/component/features/search/AiSearchViewTabs.cy.tsx#AiSearchViewTabs prevents switching when tabs are disabled
- Environment: default
- History ID: caffc01f310ebd0eede97a6969e2a82b.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: eaa7ce3e5f832c87d1d04882b1ef7020
- Status: PASSED
- Duration: 116ms
- Started: 2026-07-23T13:48:08.138Z
- Stopped: 2026-07-23T13:48:08.254Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / search / AiSearchViewTabs.cy.tsx / AiSearchViewTabs

## Labels

- language: javascript
- framework: cypress
- parentSuite: AiSearchViewTabs
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.features.search.AiSearchViewTabs.cy.tsx
- \_fallbackTestCaseId: a4fcd14b5dea1e4230a674c00698555a

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
- Duration: 116ms
- Started: 2026-07-23T13:48:08.138Z
- Stopped: 2026-07-23T13:48:08.254Z
- Steps Recorded: 10
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 16ms
- Started: 2026-07-23T13:48:08.138Z
- Stopped: 2026-07-23T13:48:08.154Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Attachments

None

### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>
- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] contains button, Notes (3ms)
  - Parameters: Content=Notes, Applied To=<body>...</body>, Yielded=<button type="button" data-state="on" data-disabled="true" role="radio" aria-checked="true" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-note" aria-label="Note view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Notes</button>, Elements=1
- [PASSED] assert expected subject to have attribute aria-disabled (19ms)
  - Parameters: actual=true, expected=true, subject=<button type="button" data-state="on" data-disabled="true" role="radio" aria-checked="true" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-note" aria-label="Note view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Notes</button>
- [PASSED] contains button, Chunks (3ms)
  - Parameters: Content=Chunks, Applied To=<body>...</body>, Yielded=<button type="button" data-state="off" data-disabled="true" role="radio" aria-checked="false" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-chunk" aria-label="Chunk view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Chunks</button>, Elements=1
- [PASSED] assert expected \<button.inline-flex.items-center.justify-center.font-medium.ring-offset-background.transition-colors.hover:bg-muted.hover:text-muted-foreground.focus-visible:outline-none.focus-visible:ring-1.focus-visible:ring-ring.focus-visible:ring-offset-1.disabled:pointer-events-none.disabled:opacity-50.data-\[state=on\]:bg-accent.data-\[state=on\]:text-accent-foreground.text-xs.h-6.px-2.5.rounded-full.data-\[disabled=true\]:opacity-50.data-\[disabled=true\]:cursor-not-allowed\> to have attribute aria-disabled with the value true (0s)
  - Parameters: actual=true, expected=true, subject=<button type="button" data-state="off" data-disabled="true" role="radio" aria-checked="false" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-chunk" aria-label="Chunk view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Chunks</button>
- [PASSED] contains button, Chunks (1ms)
  - Parameters: Content=Chunks, Applied To=<body>...</body>, Yielded=<button type="button" data-state="off" data-disabled="true" role="radio" aria-checked="false" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-chunk" aria-label="Chunk view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Chunks</button>, Elements=1
- [PASSED] click {force: true} (53ms)
  - Parameters: Applied To=<button type="button" data-state="off" data-disabled="true" role="radio" aria-checked="false" class="inline-flex items-center justify-center font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs h-6 px-2.5 rounded-full data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed" data-testid="ai-search-view-tab-chunk" aria-label="Chunk view" aria-disabled="true" tabindex="-1" data-radix-collection-item="">Chunks</button>, Elements=1, Coords={"x":89,"y":18}, Options={"force":true}
- [PASSED] get @onChange (1ms)
  - Parameters: Alias=@onChange, Yielded=onChange
  - [PASSED] assert expected onChange to not have been called at least once (0s)
    - Parameters: actual=onChange
