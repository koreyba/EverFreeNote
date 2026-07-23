# Test Result

- Name: does not over-fetch with stale offset after search identity changes
- Full Name: everfreenote:cypress/component/ui/web/hooks/useAIPaginatedSearch.cy.tsx#useAIPaginatedSearch does not over-fetch with stale offset after search identity changes
- Environment: default
- History ID: 15cb2433ced629e501fddd01bfade9df.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 0cbde13bbb76043b1b71abf7d8ae413c
- Status: PASSED
- Duration: 202ms
- Started: 2026-07-23T13:49:07.931Z
- Stopped: 2026-07-23T13:49:08.133Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / web / hooks / useAIPaginatedSearch.cy.tsx / useAIPaginatedSearch

## Labels

- language: javascript
- framework: cypress
- parentSuite: useAIPaginatedSearch
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.web.hooks.useAIPaginatedSearch.cy.tsx
- \_fallbackTestCaseId: 4760679870f69497d1794d86a8764e9f

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
- Duration: 202ms
- Started: 2026-07-23T13:49:07.931Z
- Stopped: 2026-07-23T13:49:08.133Z
- Steps Recorded: 17
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 10ms
- Started: 2026-07-23T13:49:07.931Z
- Stopped: 2026-07-23T13:49:07.941Z

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
- [PASSED] get @invoke (20ms)
  - Parameters: Alias=@invoke, Yielded=invoke
  - [PASSED] assert expected invoke to have been called with arguments matching "rag-search", {body: {query: ontology, topk: 5}}, but it was never called (18ms)
- [PASSED] get \[data-cy="identity-load-more"\] (1ms)
  - Parameters: Selector=[data-cy="identity-load-more"], Yielded=<button type="button" data-cy="identity-load-more">Load More</button>, Elements=1
- [PASSED] click (72ms)
  - Parameters: Applied To=<button type="button" data-cy="identity-load-more">Load More</button>, Elements=1, Coords={"x":47,"y":54}
- [PASSED] get \[data-cy="identity-offset"\] (2ms)
  - Parameters: Selector=[data-cy="identity-offset"], Yielded=<div data-cy="identity-offset">0</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain '5' (0s)
    - Parameters: subject=<div data-cy="identity-offset">0</div>
- [PASSED] get @invoke (2ms)
  - Parameters: Alias=@invoke, Yielded=invoke
  - [PASSED] assert expected invoke to have been called with arguments matching "rag-search", {body: {query: ontology, topk: 10}} (0s)
- [PASSED] get \[data-cy="identity-switch-query"\] (0s)
  - Parameters: Selector=[data-cy="identity-switch-query"], Yielded=<button type="button" data-cy="identity-switch-query">Switch ...</button>, Elements=1
- [PASSED] click (72ms)
  - Parameters: Applied To=<button type="button" data-cy="identity-switch-query">Switch ...</button>, Elements=1, Coords={"x":135,"y":54}
- [PASSED] get \[data-cy="identity-query"\] (2ms)
  - Parameters: Selector=[data-cy="identity-query"], Yielded=<div data-cy="identity-query">ethics</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain ethics (0s)
    - Parameters: subject=<div data-cy="identity-query">ethics</div>
- [PASSED] get @invoke (1ms)
  - Parameters: Alias=@invoke, Yielded=invoke
  - [PASSED] assert expected invoke to have been called with arguments matching "rag-search", {body: {query: ethics, topk: 5}} (0s)
- [PASSED] get @invoke (0s)
  - Parameters: Alias=@invoke, Yielded=invoke
  - [PASSED] assert expected invoke to not have been called with arguments matching "rag-search", {body: {query: ethics, topk: 10}} (0s)
