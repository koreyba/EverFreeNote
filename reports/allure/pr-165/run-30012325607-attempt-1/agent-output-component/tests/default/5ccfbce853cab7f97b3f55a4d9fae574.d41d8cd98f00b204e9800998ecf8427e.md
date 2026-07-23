# Test Result

- Name: switching from normal search to AI triggers only AI search for the current query
- Full Name: everfreenote:cypress/component/features/notes/SearchResultsPanel.cy.tsx#SearchResultsPanel switching from normal search to AI triggers only AI search for the current query
- Environment: default
- History ID: 5ccfbce853cab7f97b3f55a4d9fae574.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: bebaa472e98b608f6010564d303c46b4
- Status: PASSED
- Duration: 456ms
- Started: 2026-07-23T13:47:50.391Z
- Stopped: 2026-07-23T13:47:50.847Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / notes / SearchResultsPanel.cy.tsx / SearchResultsPanel

## Labels

- language: javascript
- framework: cypress
- parentSuite: SearchResultsPanel
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.features.notes.SearchResultsPanel.cy.tsx
- \_fallbackTestCaseId: a1202c345bf557974bb2ff97705e494e

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
- Duration: 456ms
- Started: 2026-07-23T13:47:50.391Z
- Stopped: 2026-07-23T13:47:50.847Z
- Steps Recorded: 14
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 15ms
- Started: 2026-07-23T13:47:50.391Z
- Stopped: 2026-07-23T13:47:50.406Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 1ms
- Started: 2026-07-23T13:47:50.406Z
- Stopped: 2026-07-23T13:47:50.407Z

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
- [PASSED] clock
  - Parameters: Now=0, Methods replaced=["setTimeout","clearTimeout","setInterval","clearInterval","Date","performance","requestAnimationFrame","cancelAnimationFrame","...
- [PASSED] get \[data-testid="search-panel-input"\]
  - Parameters: Selector=[data-testid="search-panel-input"], Yielded=<input class="flex w-full border px-3 py-1 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-9 pr-7 h-9 bg-background transition-all rounded-full border-border/40 shadow-sm focus-visible:border-primary/40 ring-1 ring-primary/35 focus-visible:ring-primary/60" data-testid="search-panel-input" placeholder="Search notes…" type="text" value="ontology">, Elements=1
- [PASSED] type ontology
  - Parameters: Applied To=<input class="flex w-full border px-3 py-1 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-9 pr-7 h-9 bg-background transition-all rounded-full border-border/40 shadow-sm focus-visible:border-primary/40 ring-1 ring-primary/35 focus-visible:ring-primary/60" data-testid="search-panel-input" placeholder="Search notes…" type="text" value="ontology">, Elements=1, Coords={"x":124,"y":60}, Typed=ontology
- [PASSED] get \[aria-label="Toggle AI RAG Search"\]
  - Parameters: Selector=[aria-label="Toggle AI RAG Search"], Yielded=<button type="button" role="switch" aria-checked="true" data-state="checked" value="on" class="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" id="ai-search-toggle" data-testid="ai-search-toggle-switch" aria-label="Toggle AI RAG Search">...</button>, Elements=1
- [PASSED] click {force: true}
  - Parameters: Applied To=<button type="button" role="switch" aria-checked="true" data-state="checked" value="on" class="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" id="ai-search-toggle" data-testid="ai-search-toggle-switch" aria-label="Toggle AI RAG Search">...</button>, Elements=1, Coords={"x":16,"y":131}, Options={"force":true}
- [PASSED] tick 400ms
  - Parameters: Now=400, Methods replaced=["setTimeout","clearTimeout","setInterval","clearInterval","Date","performance","requestAnimationFrame","cancelAnimationFrame","..., Ticked=400 milliseconds
- [PASSED] assert expected \[ Array(1) \] to have property length (0s)
  - Parameters: actual=[{"thisValue":{},"args":["rag-search",null],"lastArg":{},"returnValue":{},"callId":38,"errorWithCallStack":{}}]
- [PASSED] assert expected \[ Array(1) \] to have a length of 1 (0s)
  - Parameters: actual=1, expected=1
- [PASSED] assert expected invoke to have been called with arguments matching "rag-search", {body: {query: ontology}} (0s)
- [PASSED] wrap function(){} (0s)
  - Parameters: Yielded=stub
  - [PASSED] assert expected stub to not have been called at least once (0s)
    - Parameters: actual=stub
- [PASSED] contains AI Result One (0s)
  - Parameters: Content=AI Result One, Applied To=<body style="">...</body>, Yielded=<h3 class="text-[13.5px] font-semibold leading-snug text-foreground flex-1 line-clamp-2 pl-6">AI Resu...</h3>, Elements=1
- [PASSED] assert expected subject to be visible (0s)
  - Parameters: subject=<h3 class="text-[13.5px] font-semibold leading-snug text-foreground flex-1 line-clamp-2 pl-6">AI Resu...</h3>
