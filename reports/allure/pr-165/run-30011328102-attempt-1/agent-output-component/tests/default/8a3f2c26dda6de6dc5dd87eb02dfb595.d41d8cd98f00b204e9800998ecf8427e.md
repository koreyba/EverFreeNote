# Test Result

- Name: включает skipFileDuplicates при отметке чекбокса
- Full Name: everfreenote:cypress/component/ui/ImportDialog.cy.tsx#ImportDialog включает skipFileDuplicates при отметке чекбокса
- Environment: default
- History ID: 8a3f2c26dda6de6dc5dd87eb02dfb595.d41d8cd98f00b204e9800998ecf8427e
- Test Result ID: cb0f9b799385b8ac1b584d354aed4aae
- Status: PASSED
- Duration: 265ms
- Started: 2026-07-23T13:32:18.460Z
- Stopped: 2026-07-23T13:32:18.725Z
- Flaky: false
- Known: false
- Muted: false
- Retries in This Run: 0
- Title Path: everfreenote / cypress / component / ui / ImportDialog.cy.tsx / ImportDialog

## Labels

- language: javascript
- framework: cypress
- parentSuite: ImportDialog
- host: runnervm3jd5f
- thread: pid-2836-worker-main
- package: everfreenote.cypress.component.ui.ImportDialog.cy.tsx
- \_fallbackTestCaseId: 8b878ce51db0dbdf3c45f2c065976fbb

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
- Duration: 265ms
- Started: 2026-07-23T13:32:18.460Z
- Stopped: 2026-07-23T13:32:18.725Z
- Steps Recorded: 10
- Attachments Recorded: 0

### Error

None

### Fixtures

### Before Fixture: "before each" hook

- Status: PASSED
- Duration: 14ms
- Started: 2026-07-23T13:32:18.463Z
- Stopped: 2026-07-23T13:32:18.477Z

#### Error

None

#### Steps

- [PASSED] window (1ms)
  - Parameters: Yielded=<window>

### Attachments

None

### Steps

- [PASSED] mount \<SupabaseTestProvider ... /\> (1ms)
  - Parameters: description=Mounts React component, home=https://github.com/cypress-io/cypress, supabase={"auth":{},"functions":{}}, user={"id":"test-user"}, loading=false, children={"type":{"_currentValue":null,"_currentValue2":null,"_threadCount":0,"Consumer":{},"_currentRenderer":null,"_currentRenderer2":n...
- [PASSED] get #skip-file-duplicates (33ms)
  - Parameters: Selector=#skip-file-duplicates, Yielded=<button type="button" role="checkbox" aria-checked="true" data-state="checked" value="on" class="peer h-4 w-4 shrink-0 rounded-sm border border-primary! shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all duration-150" id="skip-file-duplicates">...</button>, Elements=1
- [PASSED] click (85ms)
  - Parameters: Applied To=<button type="button" role="checkbox" aria-checked="true" data-state="checked" value="on" class="peer h-4 w-4 shrink-0 rounded-sm border border-primary! shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all duration-150" id="skip-file-duplicates">...</button>, Elements=1, Coords={"x":16,"y":327}
- [PASSED] get input\[type="file"\] (0s)
  - Parameters: Selector=input[type="file"], Yielded=<input multiple="" accept=".enex" aria-label="Upload ENEX file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file">, Elements=1
- [PASSED] selectFile cypress/fixtures/enex/test-single-note.enex, {force: true} (20ms)
  - Parameters: Target=<input multiple="" accept=".enex" aria-label="Upload ENEX file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="file">, Elements=1
- [PASSED] contains button, /^Import/ (2ms)
  - Parameters: Content={}, Applied To=<body style="pointer-events: none;" data-scroll-locked="1">...</body>, Yielded=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-full shadow-sm" disabled="">Import</button>, Elements=1
- [PASSED] click (87ms)
  - Parameters: Applied To=<button class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-full shadow-sm" disabled="">Import</button>, Elements=1, Coords={"x":102,"y":423}
- [PASSED] get @onImport (0s)
  - Parameters: Alias=@onImport, Yielded=onImport
- [PASSED] its .firstCall.args.1 (0s)
  - Parameters: Property=.firstCall.args.1, Subject=onImport, Yielded={"duplicateStrategy":"prefix","skipFileDuplicates":true}
  - [PASSED] assert expected true to be true (0s)
    - Parameters: actual=true, expected=true
