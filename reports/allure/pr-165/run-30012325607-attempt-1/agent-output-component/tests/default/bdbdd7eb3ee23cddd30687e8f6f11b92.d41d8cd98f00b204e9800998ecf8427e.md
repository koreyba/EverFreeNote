# Test Result

- Name: reports partial failures and still invalidates notes and aiSearch
- Full Name: everfreenote:cypress/component/ui/web/hooks/useNoteBulkActionsDirect.cy.tsx#useNoteBulkActions direct reports partial failures and still invalidates notes and aiSearch
- Environment: default
- History ID: bdbdd7eb3ee23cddd30687e8f6f11b92.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 612217235e99b82be393b8648b99941f
- Status: PASSED
- Duration: 141ms
- Started: 2026-07-23T13:49:31.577Z
- Stopped: 2026-07-23T13:49:31.718Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / web / hooks / useNoteBulkActionsDirect.cy.tsx / useNoteBulkActions direct

## Labels

- language: javascript
- framework: cypress
- parentSuite: useNoteBulkActions direct
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.web.hooks.useNoteBulkActionsDirect.cy.tsx
- \_fallbackTestCaseId: 356f2300f320d86a08036e285fb62190

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
- Duration: 141ms
- Started: 2026-07-23T13:49:31.577Z
- Stopped: 2026-07-23T13:49:31.718Z
- Steps Recorded: 13
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 17ms
- Started: 2026-07-23T13:49:31.580Z
- Stopped: 2026-07-23T13:49:31.597Z

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
- [PASSED] get \[data-cy="delete-two"\] (18ms)
  - Parameters: Selector=[data-cy="delete-two"], Yielded=<button type="button" data-cy="delete-two">Delete Two</button>, Elements=1
- [PASSED] click (76ms)
  - Parameters: Applied To=<button type="button" data-cy="delete-two">Delete Two</button>, Elements=1, Coords={"x":145,"y":18}
- [PASSED] get \[data-cy="result"\] (3ms)
  - Parameters: Selector=[data-cy="result"], Yielded=<div data-cy="result">{"total...</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain "failed":1 (0s)
    - Parameters: subject=<div data-cy="result">{"total...</div>
- [PASSED] get @mutateAsync (2ms)
  - Parameters: Alias=@mutateAsync, Yielded=mutateAsync
  - [PASSED] assert expected mutateAsync to have been called exactly "twice" (1ms)
    - Parameters: actual=mutateAsync
- [PASSED] get @invalidateQueries (2ms)
  - Parameters: Alias=@invalidateQueries, Yielded=invalidateQueries
  - [PASSED] assert expected invalidateQueries to have been called with arguments matching {querykey: \[notes\]} (0s)
- [PASSED] get @invalidateQueries (1ms)
  - Parameters: Alias=@invalidateQueries, Yielded=invalidateQueries
  - [PASSED] assert expected invalidateQueries to have been called with arguments matching {querykey: \[aiSearch\]} (0s)
- [PASSED] get @setSelectedNote (0s)
  - Parameters: Alias=@setSelectedNote, Yielded=setSelectedNote
  - [PASSED] assert expected setSelectedNote to have been called with arguments null (0s)
