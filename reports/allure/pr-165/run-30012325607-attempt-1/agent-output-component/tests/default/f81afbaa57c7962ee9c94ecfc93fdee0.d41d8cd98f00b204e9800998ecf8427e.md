# Test Result

- Name: shows moon icon in light mode
- Full Name: everfreenote:cypress/component/providers/ThemeToggle.cy.tsx#ThemeToggle Component shows moon icon in light mode
- Environment: default
- History ID: f81afbaa57c7962ee9c94ecfc93fdee0.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 319bc821214a6ce9d2e33a7998a4e092
- Status: PASSED
- Duration: 51ms
- Started: 2026-07-23T13:44:44.582Z
- Stopped: 2026-07-23T13:44:44.633Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / providers / ThemeToggle.cy.tsx / ThemeToggle Component

## Labels

- language: javascript
- framework: cypress
- parentSuite: ThemeToggle Component
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.providers.ThemeToggle.cy.tsx
- \_fallbackTestCaseId: e23133f3e67c16f06cc537500c2c8289

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
- Duration: 51ms
- Started: 2026-07-23T13:44:44.582Z
- Stopped: 2026-07-23T13:44:44.633Z
- Steps Recorded: 4
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 16ms
- Started: 2026-07-23T13:44:44.583Z
- Stopped: 2026-07-23T13:44:44.599Z

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
- [PASSED] get button (19ms)
  - Parameters: Selector=button, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground w-9 h-9" title="Switch to dark mode">...</button>, Elements=1
- [PASSED] find svg (4ms)
  - Parameters: Selector=svg, Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground w-9 h-9" title="Switch to dark mode">...</button>, Yielded=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon h-4 w-4 transition-all" aria-hidden="true">...</svg>, Elements=1
  - [PASSED] assert expected \<svg.lucide.lucide-moon.h-4.w-4.transition-all\> to exist in the DOM (0s)
    - Parameters: actual=<svg.lucide.lucide-moon.h-4.w-4.transition-all>, expected=<svg.lucide.lucide-moon.h-4.w-4.transition-all>, subject=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon h-4 w-4 transition-all" aria-hidden="true">...</svg>
