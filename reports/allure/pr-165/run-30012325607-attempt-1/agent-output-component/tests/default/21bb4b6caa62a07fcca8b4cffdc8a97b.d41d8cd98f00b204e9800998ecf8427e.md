# Test Result

- Name: shows back button in NoteView on mobile
- Full Name: everfreenote:cypress/component/features/mobile/MobileLayout.cy.tsx#Mobile Layout Adaptation shows back button in NoteView on mobile
- Environment: default
- History ID: 21bb4b6caa62a07fcca8b4cffdc8a97b.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: 0baae3a0d525425294fca2c037577d14
- Status: PASSED
- Duration: 152ms
- Started: 2026-07-23T13:46:22.262Z
- Stopped: 2026-07-23T13:46:22.414Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / mobile / MobileLayout.cy.tsx / Mobile Layout Adaptation

## Labels

- language: javascript
- framework: cypress
- parentSuite: Mobile Layout Adaptation
- host: runnervm3jd5f
- thread: pid-3007-worker-main
- package: everfreenote.cypress.component.features.mobile.MobileLayout.cy.tsx
- \_fallbackTestCaseId: c89066b0529228a8cec6548c0e19c00c

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
- Duration: 152ms
- Started: 2026-07-23T13:46:22.262Z
- Stopped: 2026-07-23T13:46:22.414Z
- Steps Recorded: 9
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 17ms
- Started: 2026-07-23T13:46:22.263Z
- Stopped: 2026-07-23T13:46:22.280Z

#### Error

None

#### Steps

- [PASSED] window (0s)
  - Parameters: Yielded=<window>

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 3ms
- Started: 2026-07-23T13:46:22.280Z
- Stopped: 2026-07-23T13:46:22.283Z

#### Error

None

#### Steps

- No steps

### Attachments

None

### Steps

- [PASSED] viewport iphone-se2 (0s)
  - Parameters: Preset=iphone-se2, Width=375, Height=667
- [PASSED] mount \<SupabaseTestProvider ... /\> (0s)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get .lucide-chevron-left (28ms)
  - Parameters: Selector=.lucide-chevron-left, Yielded=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left w-5 h-5" aria-hidden="true">...</svg>, Elements=1
  - [PASSED] assert expected .lucide-chevron-left to exist in the DOM (27ms)
    - Parameters: actual=<svg.lucide.lucide-chevron-left.w-5.h-5>, expected=<svg.lucide.lucide-chevron-left.w-5.h-5>, subject=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left w-5 h-5" aria-hidden="true">...</svg>
- [PASSED] get .lucide-chevron-left (0s)
  - Parameters: Selector=.lucide-chevron-left, Yielded=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left w-5 h-5" aria-hidden="true">...</svg>, Elements=1
- [PASSED] parent (3ms)
  - Parameters: Selector=, Applied To=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left w-5 h-5" aria-hidden="true">...</svg>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground md:hidden -ml-2 rounded-full h-9 w-9">...</button>, Elements=1
- [PASSED] click (80ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground md:hidden -ml-2 rounded-full h-9 w-9">...</button>, Elements=1, Coords={"x":28,"y":908}, Actual Element Clicked=<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left w-5 h-5" aria-hidden="true">...</svg>
- [PASSED] get @handleSelectNote (1ms)
  - Parameters: Alias=@handleSelectNote, Yielded=handleSelectNote
  - [PASSED] assert expected handleSelectNote to have been called with arguments null (0s)
