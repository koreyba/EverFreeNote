# Test Result

- Name: exitSelectionMode clears selection state
- Full Name: everfreenote:cypress/component/ui/web/hooks/useNoteBulkActions.cy.tsx#useNoteBulkActions exitSelectionMode clears selection state
- Environment: default
- History ID: bf59cb6cf6c2b0e9c9bbb4a9bb2fe690.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 92f460e57f8d7c8fe3fc339607aade85
- Status: PASSED
- Duration: 273ms
- Started: 2026-07-23T13:49:28.884Z
- Stopped: 2026-07-23T13:49:29.157Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / web / hooks / useNoteBulkActions.cy.tsx / useNoteBulkActions

## Labels

- language: javascript
- framework: cypress
- parentSuite: useNoteBulkActions
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.ui.web.hooks.useNoteBulkActions.cy.tsx
- \_fallbackTestCaseId: a7b068f387aea0e66a7980c45a77e1cd

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
- Duration: 273ms
- Started: 2026-07-23T13:49:28.884Z
- Stopped: 2026-07-23T13:49:29.157Z
- Steps Recorded: 13
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 5ms
- Started: 2026-07-23T13:49:28.897Z
- Stopped: 2026-07-23T13:49:28.902Z

#### Error

None

#### Steps

- No steps

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 10ms
- Started: 2026-07-23T13:49:28.884Z
- Stopped: 2026-07-23T13:49:28.894Z

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
- [PASSED] get \[data-cy="enter-selection-btn"\] (21ms)
  - Parameters: Selector=[data-cy="enter-selection-btn"], Yielded=<button data-cy="enter-selection-btn">Enter S...</button>, Elements=1
- [PASSED] click (70ms)
  - Parameters: Applied To=<button data-cy="enter-selection-btn">Enter S...</button>, Elements=1, Coords={"x":109,"y":108}
- [PASSED] get \[data-cy="toggle-note1-btn"\] (1ms)
  - Parameters: Selector=[data-cy="toggle-note1-btn"], Yielded=<button data-cy="toggle-note1-btn">Toggle ...</button>, Elements=1
- [PASSED] click (71ms)
  - Parameters: Applied To=<button data-cy="toggle-note1-btn">Toggle ...</button>, Elements=1, Coords={"x":308,"y":108}
- [PASSED] get \[data-cy="selectedCount"\] (2ms)
  - Parameters: Selector=[data-cy="selectedCount"], Yielded=<div data-cy="selectedCount">0</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain '1' (0s)
    - Parameters: subject=<div data-cy="selectedCount">0</div>
- [PASSED] get \[data-cy="exit-selection-btn"\] (0s)
  - Parameters: Selector=[data-cy="exit-selection-btn"], Yielded=<button data-cy="exit-selection-btn">Exit Se...</button>, Elements=1
- [PASSED] click (70ms)
  - Parameters: Applied To=<button data-cy="exit-selection-btn">Exit Se...</button>, Elements=1, Coords={"x":211,"y":108}
- [PASSED] get \[data-cy="selectionMode"\] (2ms)
  - Parameters: Selector=[data-cy="selectionMode"], Yielded=<div data-cy="selectionMode">false</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain false (0s)
    - Parameters: subject=<div data-cy="selectionMode">false</div>
- [PASSED] get \[data-cy="selectedCount"\] (1ms)
  - Parameters: Selector=[data-cy="selectedCount"], Yielded=<div data-cy="selectedCount">0</div>, Elements=1
  - [PASSED] assert expected \<div\> to contain '0' (0s)
    - Parameters: subject=<div data-cy="selectedCount">0</div>
