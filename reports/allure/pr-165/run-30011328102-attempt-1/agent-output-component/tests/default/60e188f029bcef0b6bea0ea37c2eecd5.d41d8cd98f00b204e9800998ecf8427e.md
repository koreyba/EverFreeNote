# Test Result

- Name: does not update note with published tag when checkbox is disabled
- Full Name: everfreenote:cypress/component/features/wordpress/WordPressExportDialog.cy.tsx#features/wordpress/WordPressExportDialog does not update note with published tag when checkbox is disabled
- Environment: default
- History ID: 60e188f029bcef0b6bea0ea37c2eecd5.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: ec6f283e9a9d452ae83ad10a4c5fc03a
- Status: PASSED
- Duration: 236ms
- Started: 2026-07-23T13:35:35.465Z
- Stopped: 2026-07-23T13:35:35.701Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / features / wordpress / WordPressExportDialog.cy.tsx / features/wordpress/WordPressExportDialog

## Labels

- language: javascript
- framework: cypress
- parentSuite: features/wordpress/WordPressExportDialog
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.features.wordpress.WordPressExportDialog.cy.tsx
- \_fallbackTestCaseId: bfe08bc5f6ae5673c4d5f2fe76024785

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
- Duration: 236ms
- Started: 2026-07-23T13:35:35.465Z
- Stopped: 2026-07-23T13:35:35.701Z
- Steps Recorded: 11
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 13ms
- Started: 2026-07-23T13:35:35.465Z
- Stopped: 2026-07-23T13:35:35.478Z

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
- [PASSED] contains Add published tag to the note (2ms)
  - Parameters: Content=Add published tag to the note, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer" for="wp-add-published-tag">Add pub...</label>, Elements=1
- [PASSED] assert expected subject to be visible (38ms)
  - Parameters: subject=<label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer" for="wp-add-published-tag">Add pub...</label>
- [PASSED] get #wp-add-published-tag (1ms)
  - Parameters: Selector=#wp-add-published-tag, Yielded=<button type="button" role="checkbox" aria-checked="false" data-state="unchecked" value="on" class="peer h-4 w-4 shrink-0 rounded-sm border border-primary! shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all duration-150" id="wp-add-published-tag"></button>, Elements=1
- [PASSED] click (80ms)
  - Parameters: Applied To=<button type="button" role="checkbox" aria-checked="false" data-state="unchecked" value="on" class="peer h-4 w-4 shrink-0 rounded-sm border border-primary! shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all duration-150" id="wp-add-published-tag"></button>, Elements=1, Coords={"x":28,"y":348}
- [PASSED] contains button, Export (1ms)
  - Parameters: Content=Export, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">Export</button>, Elements=1
- [PASSED] click (80ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">Export</button>, Elements=1, Coords={"x":85,"y":360}
- [PASSED] wrap function(){} (2ms)
  - Parameters: Yielded=stub
  - [PASSED] assert expected stub to not have been called at least once (1ms)
    - Parameters: actual=stub
- [PASSED] contains Post published (ID: 11). (5ms)
  - Parameters: Content=Post published (ID: 11)., Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<span>Post pu...</span>, Elements=1
- [PASSED] assert expected \<span\> to be visible (0s)
  - Parameters: subject=<span>Post pu...</span>
