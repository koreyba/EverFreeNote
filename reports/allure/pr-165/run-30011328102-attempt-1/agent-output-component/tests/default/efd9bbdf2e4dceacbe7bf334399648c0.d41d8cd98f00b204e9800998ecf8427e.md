# Test Result

- Name: requires API key for initial setup when not configured
- Full Name: everfreenote:cypress/component/features/settings/ApiKeysSettingsDialog.cy.tsx#features/settings/ApiKeysSettingsDialog requires API key for initial setup when not configured
- Environment: default
- History ID: efd9bbdf2e4dceacbe7bf334399648c0.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 1f75e65f12537c373e5c530ab1b70bc9
- Status: PASSED
- Duration: 240ms
- Started: 2026-07-23T13:35:28.034Z
- Stopped: 2026-07-23T13:35:28.274Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / settings / ApiKeysSettingsDialog.cy.tsx / features/settings/ApiKeysSettingsDialog

## Labels

- language: javascript
- framework: cypress
- parentSuite: features/settings/ApiKeysSettingsDialog
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.features.settings.ApiKeysSettingsDialog.cy.tsx
- \_fallbackTestCaseId: e6fee91af4c22fa9c4cc973b64f45251

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
- Duration: 240ms
- Started: 2026-07-23T13:35:28.034Z
- Stopped: 2026-07-23T13:35:28.274Z
- Steps Recorded: 5
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 12ms
- Started: 2026-07-23T13:35:28.037Z
- Stopped: 2026-07-23T13:35:28.049Z

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
- [PASSED] contains button, Save API key (103ms)
  - Parameters: Content=Save API key, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full sm:w-auto sm:min-w-[152px] rounded-full shadow-sm">Save AP...</button>, Elements=1
- [PASSED] click (103ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full sm:w-auto sm:min-w-[152px] rounded-full shadow-sm">Save AP...</button>, Elements=1, Coords={"x":195,"y":262}
- [PASSED] contains Gemini API key is required for initial setup. (5ms)
  - Parameters: Content=Gemini API key is required for initial setup., Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<span>Gemini ...</span>, Elements=1
- [PASSED] assert expected \<span\> to be visible (0s)
  - Parameters: subject=<span>Gemini ...</span>
