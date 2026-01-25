---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy: Offline WebView Bundle

## Test Coverage Goals
**What level of testing do we aim for?**

### Coverage Targets
- **Unit Tests**: 100% of new utility functions and scripts
  - Bundle copy script logic
  - URL selection logic
  - Local bundle detection
  - Message bridge (verify no regression)

- **Integration Tests**: Critical paths and error handling
  - WebView loads local bundle correctly
  - Message bridge works with local bundle
  - Fallback to remote URL when local unavailable
  - JavaScript injection with local bundle

- **End-to-End Tests**: Key user journeys
  - Create/edit note offline
  - Autosave in offline mode
  - Theme switching with local bundle
  - Image display (cached vs. remote)

- **Manual Tests**: Device-specific and UX validation
  - Real device testing (Android/iOS)
  - Network toggle scenarios
  - Build artifact verification
  - Performance measurement

### Alignment with Requirements
All tests map to acceptance criteria in [requirements doc](feature-offline-webview-bundle.md#success-criteria):
- ✅ Offline editing functionality
- ✅ Resource loading (images, fonts)
- ✅ Dev mode preservation
- ✅ Fallback behavior
- ✅ CI/CD automation

---

## Unit Tests
**What individual components need testing?**

### Module 1: Bundle Copy Script (`scripts/copy-web-bundle.js`)

**Test File**: `scripts/__tests__/copy-web-bundle.test.js`

- [ ] **Test 1.1**: Successfully copies bundle to Android assets
  - Setup: Create mock `out/editor-webview` with files
  - Execute: Run copy script
  - Assert: Files exist in `ui/mobile/android/app/src/main/assets/web-editor/`

- [ ] **Test 1.2**: Successfully copies bundle to iOS bundle
  - Setup: Mock source directory
  - Execute: Run copy script
  - Assert: Files exist in `ui/mobile/ios/[App]/WebEditor/`

- [ ] **Test 1.3**: Throws error when source doesn't exist
  - Setup: Empty/missing `out/` directory
  - Execute: Run copy script
  - Assert: Error thrown with helpful message

- [ ] **Test 1.4**: Calculates and logs bundle size correctly
  - Setup: Known file sizes in mock directory
  - Execute: Run copy script
  - Assert: Logged size matches expected (within tolerance)

- [ ] **Test 1.5**: Overwrites existing bundle
  - Setup: Old bundle already in destination
  - Execute: Run copy script
  - Assert: Old files replaced with new ones

**Coverage**: 100% of copy script logic

---

### Module 2: URL Selection Logic (`ui/mobile/components/EditorWebView.tsx`)

**Test File**: `ui/mobile/components/__tests__/EditorWebView.test.tsx`

- [ ] **Test 2.1**: Returns local bundle path when available (Android)
  - Setup: Mock `Platform.OS = 'android'`, mock bundle exists
  - Execute: `getEditorUrl()`
  - Assert: Returns `file:///android_asset/web-editor/index.html`

- [ ] **Test 2.2**: Returns local bundle path when available (iOS)
  - Setup: Mock `Platform.OS = 'ios'`, mock bundle exists
  - Execute: `getEditorUrl()`
  - Assert: Returns `web-editor/index.html`

- [ ] **Test 2.3**: Falls back to dev server when no local bundle (__DEV__=true)
  - Setup: Mock `__DEV__ = true`, mock bundle doesn't exist
  - Execute: `getEditorUrl()`
  - Assert: Returns `http://localhost:3000/editor-webview`

- [ ] **Test 2.4**: Falls back to production URL when no local bundle (prod)
  - Setup: Mock `__DEV__ = false`, mock bundle doesn't exist
  - Execute: `getEditorUrl()`
  - Assert: Returns `${EXPO_PUBLIC_WEB_URL}/editor-webview`

- [ ] **Test 2.5**: Logs correct messages for each scenario
  - Setup: Various scenarios
  - Execute: `getEditorUrl()`
  - Assert: Console logs contain expected prefix (✅, 🔧, 🌐)

**Coverage**: 100% of URL selection branches

---

### Module 3: Local Bundle Detection

**Test File**: `ui/mobile/components/__tests__/bundleDetection.test.ts`

- [ ] **Test 3.1**: Detects Android bundle correctly
  - Setup: Mock Android asset exists
  - Execute: `checkLocalBundleExists('file:///android_asset/...')`
  - Assert: Returns `true`

- [ ] **Test 3.2**: Detects iOS bundle correctly
  - Setup: Mock iOS bundle file exists
  - Execute: `checkLocalBundleExists('web-editor/index.html')`
  - Assert: Returns `true`

- [ ] **Test 3.3**: Returns false when bundle missing
  - Setup: Mock file system returns not found
  - Execute: `checkLocalBundleExists(...)`
  - Assert: Returns `false`

- [ ] **Test 3.4**: Handles errors gracefully
  - Setup: Mock file system throws error
  - Execute: `checkLocalBundleExists(...)`
  - Assert: Returns `false`, logs error

**Coverage**: All error handling paths

---

### Module 4: Message Bridge (Regression Tests)

**Test File**: `core/utils/__tests__/editorWebViewBridge.test.ts`

- [ ] **Test 4.1**: Sends READY message correctly
  - Execute: `sendMessage({ type: 'READY' })`
  - Assert: postMessage called with correct payload

- [ ] **Test 4.2**: Chunks large content correctly
  - Setup: Content > chunk size threshold
  - Execute: `sendMessage({ type: 'CONTENT_CHANGED', content: largeContent })`
  - Assert: Multiple messages sent with chunk headers

- [ ] **Test 4.3**: Reassembles chunked messages
  - Setup: Receive multiple chunk messages
  - Execute: Process messages
  - Assert: Final content matches original

- [ ] **Test 4.4**: Handles message types correctly
  - Execute: Various message types
  - Assert: Correct handlers invoked

**Coverage**: Verify no regression from existing tests

---

## Integration Tests
**How do we test component interactions?**

### Integration Scenario 1: WebView Loads Local Bundle

**Test File**: `ui/mobile/__tests__/integration/webview-local-bundle.test.tsx`

- [ ] **INT-1**: WebView initializes with local bundle on Android
  - Setup: Build app with bundled editor, run on Android emulator
  - Execute: Mount `EditorWebView` component
  - Assert:
    - WebView `source.uri` is `file:///android_asset/...`
    - `onLoadEnd` fires successfully
    - No `onError` fired

- [ ] **INT-2**: WebView initializes with local bundle on iOS
  - Setup: Build app with bundled editor, run on iOS simulator
  - Execute: Mount `EditorWebView` component
  - Assert:
    - WebView `source.uri` is `web-editor/index.html`
    - `onLoadEnd` fires successfully
    - No `onError` fired

---

### Integration Scenario 2: JavaScript Injection with Local Bundle

**Test File**: `ui/mobile/__tests__/integration/webview-injection.test.tsx`

- [ ] **INT-3**: Config injected before local bundle loads
  - Setup: WebView with local bundle
  - Execute: Load WebView, check injected JavaScript
  - Assert: `window.MOBILE_CONFIG` available in web context
  
- [ ] **INT-4**: Theme applied correctly from injection
  - Setup: Set theme to 'dark' in React Native
  - Execute: Load WebView
  - Assert: Editor has dark theme applied

- [ ] **INT-5**: Supabase config accessible in web page
  - Setup: Inject config with Supabase URL/key
  - Execute: Check web context
  - Assert: `window.MOBILE_CONFIG.supabaseUrl` is correct

---

### Integration Scenario 3: Message Bridge with Local Bundle

**Test File**: `ui/mobile/__tests__/integration/message-bridge.test.tsx`

- [ ] **INT-6**: READY message received from local bundle
  - Setup: Load WebView with local bundle
  - Execute: Wait for message
  - Assert: Receive `{ type: 'READY' }` within 2 seconds

- [ ] **INT-7**: SET_CONTENT message sent to local bundle
  - Setup: WebView loaded and ready
  - Execute: Send `{ type: 'SET_CONTENT', content: 'Test' }`
  - Assert: Web editor displays "Test"

- [ ] **INT-8**: CONTENT_CHANGED received after typing
  - Setup: WebView loaded with editor
  - Execute: Simulate typing in editor
  - Assert: Receive `{ type: 'CONTENT_CHANGED', content: '...' }`

- [ ] **INT-9**: Chunked message works with large content
  - Setup: WebView ready
  - Execute: Send large content (5MB)
  - Assert: All chunks received, content complete

---

### Integration Scenario 4: Fallback Behavior

**Test File**: `ui/mobile/__tests__/integration/fallback.test.tsx`

- [ ] **INT-10**: Falls back to remote URL when local bundle missing
  - Setup: Build without copying bundle
  - Execute: Load WebView
  - Assert: WebView loads remote URL, no error

- [ ] **INT-11**: Dev mode uses localhost regardless of bundle
  - Setup: `__DEV__ = true`, bundle may or may not exist
  - Execute: Load WebView
  - Assert: Uses `localhost:3000`

- [ ] **INT-12**: Error handling when both local and remote fail
  - Setup: No local bundle, network offline
  - Execute: Load WebView
  - Assert: `onError` fired, error UI shown

---

### Integration Scenario 5: Build Process

**Test File**: `scripts/__tests__/integration/build-process.test.js`

- [ ] **INT-13**: Complete build pipeline succeeds
  - Setup: Clean environment
  - Execute: `npm run build && node scripts/copy-web-bundle.js`
  - Assert:
    - `out/editor-webview/` exists
    - Android assets copied
    - iOS bundle copied
    - No errors

- [ ] **INT-14**: Bundle metadata included
  - Setup: Run build with version/hash
  - Execute: Check copied bundle
  - Assert: `bundle-metadata.json` exists with correct data

---

## End-to-End Tests
**What user flows need validation?**

### E2E Flow 1: Create Note Offline

**Test File**: `cypress/e2e/offline-note-creation.cy.ts` or manual

- [ ] **E2E-1**: User creates new note without network
  - Given: Mobile app installed with bundled editor
  - And: Device network disabled
  - When: User taps "New Note"
  - Then: Editor screen opens
  - And: Tiptap editor is visible and interactive
  - When: User types "Hello offline world"
  - Then: Text appears in editor
  - When: User navigates away
  - Then: Note is saved locally
  - When: User returns to note
  - Then: Content is preserved

**Critical Path**: Note creation → Editing → Autosave → Persistence

---

### E2E Flow 2: Edit Existing Note Offline

- [ ] **E2E-2**: User edits existing note without network
  - Given: Note exists with content "Original content"
  - And: Device network disabled
  - When: User opens note
  - Then: Editor loads with original content
  - When: User edits to "Updated content"
  - And: User loses focus (blur event)
  - Then: `CONTENT_ON_BLUR` message sent
  - And: Content saved locally
  - When: User reopens note
  - Then: "Updated content" is displayed

**Critical Path**: Load existing → Edit → Blur autosave → Reopen

---

### E2E Flow 3: Format Text Offline

- [ ] **E2E-3**: User applies formatting without network
  - Given: Editor open offline
  - When: User types "Bold text"
  - And: Selects "Bold"
  - And: Applies bold formatting
  - Then: Text appears bold in editor
  - When: User saves and reopens
  - Then: Bold formatting is preserved

**Critical Path**: Formatting → Visual feedback → Persistence

---

### E2E Flow 4: Theme Switch with Local Bundle

- [ ] **E2E-4**: Theme changes apply to local bundle
  - Given: Editor open with light theme
  - When: User switches system theme to dark
  - Then: Editor UI changes to dark theme
  - And: No errors in console
  - And: Text remains readable

**Critical Path**: Theme injection → Visual update

---

### E2E Flow 5: Insert Image Offline (with cached image)

- [ ] **E2E-5**: Cached images display offline
  - Given: Note with previously loaded image (cached)
  - And: Device network disabled
  - When: User opens note
  - Then: Image displays from cache
  - When: User tries to insert new image from URL
  - Then: Graceful error or loading state (expected limitation)

**Critical Path**: Image load → Cache hit → Display

**Note**: External image URLs expected to fail offline; document limitation

---

### E2E Flow 6: Online Fallback

- [ ] **E2E-6**: App works online with remote URL if no bundle
  - Given: App built without local bundle
  - And: Device network enabled
  - When: User opens editor
  - Then: WebView loads remote URL
  - And: Editor functions normally

**Critical Path**: Fallback → Remote load → Normal operation

---

## Test Data
**What data do we use for testing?**

### Test Fixtures

**`cypress/fixtures/sample-note-offline.json`**
```json
{
  "id": "test-note-1",
  "title": "Offline Test Note",
  "content": "<p>This is a <strong>test note</strong> for offline editing.</p>",
  "created_at": "2026-01-13T10:00:00Z",
  "updated_at": "2026-01-13T10:00:00Z"
}
```

**`cypress/fixtures/large-note-content.html`**
- File with 5MB of HTML content for chunked message testing

**`scripts/__tests__/fixtures/mock-bundle/`**
- Mock `index.html` with minimal Tiptap setup
- Mock `_next/static/` folder with fake JS/CSS
- Total size ~1MB for test purposes

### Seed Data Requirements

For integration tests:
- 1 user account with offline notes
- 5 sample notes (varying sizes: 1KB, 10KB, 100KB, 1MB, 5MB)
- 2 notes with images (one cached, one remote)

### Test Database Setup

- Use in-memory SQLite for mobile tests
- Mock Supabase client responses
- No actual network calls in unit/integration tests

---

## Test Reporting & Coverage
**How do we verify and communicate test results?**

### Coverage Commands

**Web Tests (Jest)**
```bash
npm run test -- --coverage
# Target: 100% for new/changed code
```

**Mobile Tests (Jest + React Native Testing Library)**
```bash
cd ui/mobile
npm run test -- --coverage
# Target: 100% for EditorWebView, URL logic
```

**Script Tests**
```bash
cd scripts
npm run test -- --coverage
# Target: 100% for copy-web-bundle.js
```

### Coverage Thresholds

**`jest.config.js`** (add/update):
```javascript
module.exports = {
  collectCoverageFrom: [
    'scripts/copy-web-bundle.js',
    'ui/mobile/components/EditorWebView.tsx',
    'core/utils/editorWebViewBridge.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### Coverage Gaps & Rationale

**Expected Gaps (Acceptable)**:
- Platform-specific native modules (Android/iOS file system): Hard to mock, validated manually
- CI-specific build steps: Tested in actual CI environment
- Error recovery paths requiring specific device states: Manual testing

**Must Cover 100%**:
- `getEditorUrl()` logic
- `checkLocalBundleExists()` logic
- Message bridge functions
- Bundle copy script

### Test Reports

**Output Locations**:
- `coverage/lcov-report/index.html` - Web tests
- `ui/mobile/coverage/` - Mobile tests
- CI artifacts: Uploaded to GitHub Actions

**Manual Testing Log**: `docs/ai/testing/manual-test-results.md` (create during Phase 5)

**Latest Coverage Check** (as of implementation):
- Web tests: TBD (run after implementation)
- Mobile tests: TBD
- TypeScript compilation: `npx tsc --noEmit` (must pass)

---

## Manual Testing
**What requires human validation?**

### Checklist 1: Android Device Testing (Offline Mode)

**Device**: Real Android phone (not emulator)

- [ ] **MT-A1**: Install APK with bundled editor
- [ ] **MT-A2**: Enable Airplane mode (no WiFi, no cellular)
- [ ] **MT-A3**: Open app and navigate to "New Note"
- [ ] **MT-A4**: Verify editor loads within 1 second
- [ ] **MT-A5**: Type at least 100 words → verify no lag
- [ ] **MT-A6**: Apply formatting (bold, italic, lists) → verify works
- [ ] **MT-A7**: Navigate away → return → verify content saved
- [ ] **MT-A8**: Check app logs for "Using local editor bundle"
- [ ] **MT-A9**: Re-enable network → verify app still works
- [ ] **MT-A10**: Check bundle version in app (if implemented)

**Expected Result**: All steps complete without errors, editor fully functional offline

---

### Checklist 2: iOS Device Testing (Offline Mode)

**Device**: Real iPhone (not simulator)

- [ ] **MT-I1**: Install IPA with bundled editor (TestFlight or direct)
- [ ] **MT-I2**: Enable Airplane mode
- [ ] **MT-I3**: Open app and navigate to "New Note"
- [ ] **MT-I4**: Verify editor loads within 1 second
- [ ] **MT-I5**: Type at least 100 words → verify no lag
- [ ] **MT-I6**: Apply formatting (bold, italic, lists) → verify works
- [ ] **MT-I7**: Navigate away → return → verify content saved
- [ ] **MT-I8**: Check iOS console for "Using local editor bundle"
- [ ] **MT-I9**: Re-enable network → verify app still works
- [ ] **MT-I10**: Test on multiple iOS versions (if possible)

**Expected Result**: All steps complete without errors, editor fully functional offline

---

### Checklist 3: Theme and Visual Testing

**Platforms**: Android + iOS

- [ ] **MT-V1**: Start with light theme → verify editor has light background
- [ ] **MT-V2**: Switch to dark theme → verify editor updates immediately
- [ ] **MT-V3**: Check text readability in both themes
- [ ] **MT-V4**: Verify toolbar icons visible in both themes
- [ ] **MT-V5**: Check image display (if any) in both themes
- [ ] **MT-V6**: Verify no flashing/flickering during theme switch

**Expected Result**: Seamless theme switching, good UX in both themes

---

### Checklist 4: Image and Asset Testing

**Platforms**: Android + iOS (online + offline)

- [ ] **MT-IMG1**: Insert image from Supabase Storage (online) → verify loads
- [ ] **MT-IMG2**: Go offline → reopen note → verify image cached (if implemented)
- [ ] **MT-IMG3**: Go offline → try to insert new image → verify graceful handling
- [ ] **MT-IMG4**: Check fonts render correctly offline
- [ ] **MT-IMG5**: Check CSS/styles load correctly from local bundle

**Expected Result**: Assets load correctly; graceful degradation for uncached external resources

---

### Checklist 5: Fallback and Error Scenarios

**Platforms**: Android + iOS

- [ ] **MT-FB1**: Delete local bundle from app → verify fallback to remote URL
- [ ] **MT-FB2**: No bundle + no network → verify error message shown
- [ ] **MT-FB3**: Dev mode → verify uses localhost regardless of bundle
- [ ] **MT-FB4**: Corrupt bundle (partial files) → verify fallback or error
- [ ] **MT-FB5**: Message timeout → verify retry or error handling

**Expected Result**: Graceful degradation, clear error messages, no crashes

---

### Checklist 6: Performance and UX

**Tools**: Android Profiler, Xcode Instruments

- [ ] **MT-P1**: Measure editor load time (local bundle): Target < 1s
- [ ] **MT-P2**: Measure time from tap to interactive editor: Target < 1.5s
- [ ] **MT-P3**: Check APK/IPA size increase: Target < 5MB added
- [ ] **MT-P4**: Profile memory usage during editing: Target no leaks
- [ ] **MT-P5**: Test rapid typing → verify no lag or dropped characters
- [ ] **MT-P6**: Test autosave latency: Target < 200ms from blur

**Expected Result**: Performance meets targets, good user experience

---

### Checklist 7: Build and CI Validation

**Environment**: CI pipeline (GitHub Actions)

- [ ] **MT-CI1**: Trigger full CI build
- [ ] **MT-CI2**: Verify web build step succeeds
- [ ] **MT-CI3**: Verify bundle copy step logs success
- [ ] **MT-CI4**: Verify mobile build steps succeed (Android + iOS)
- [ ] **MT-CI5**: Download APK/IPA artifacts
- [ ] **MT-CI6**: Extract APK → verify `assets/web-editor/` contains bundle
- [ ] **MT-CI7**: Check bundle-metadata.json for correct version/hash
- [ ] **MT-CI8**: Verify build logs show bundle size

**Expected Result**: CI builds successfully, artifacts contain bundled editor

---

## Performance Testing
**How do we validate performance?**

### Load Testing Scenarios

Not applicable (single-user mobile app)

### Stress Testing Approach

- [ ] **PERF-1**: Edit very large note (10MB content)
  - Measure: Time to load, time to save, memory usage
  - Target: < 2s load, < 500ms save, < 100MB memory

- [ ] **PERF-2**: Rapid content changes (simulate fast typing)
  - Execute: Type 500 characters in 5 seconds
  - Measure: Dropped characters, lag, debounce effectiveness
  - Target: Zero dropped characters, < 50ms lag

- [ ] **PERF-3**: Many notes in database (1000+ notes)
  - Measure: Editor load time (should not be affected)
  - Target: Still < 1s load

### Performance Benchmarks

**Baseline (Remote URL, Online)**:
- Editor load time: ~1.5s (network dependent)
- READY message: ~200ms after load
- Autosave latency: ~150ms

**Target (Local Bundle, Offline)**:
- Editor load time: < 1s ✅
- READY message: < 500ms ✅
- Autosave latency: < 200ms ✅

**Measurement Tools**:
- `performance.now()` in web page
- `Date.now()` in React Native
- Chrome DevTools (for web profiling)
- React DevTools Profiler

---

## Bug Tracking
**How do we manage issues?**

### Issue Tracking Process

1. **Discovery**: Tester finds issue
2. **Documentation**: Create GitHub issue with:
   - Title: `[Offline WebView] Brief description`
   - Labels: `bug`, `offline-editor`, `priority:high/medium/low`
   - Description: Steps to reproduce, expected vs actual, logs
3. **Triage**: Assign priority and milestone
4. **Fix**: Developer implements fix, references issue in commit
5. **Verification**: Tester verifies fix, closes issue

### Bug Severity Levels

**P0 - Critical** (blocks release):
- Editor doesn't load offline
- Data loss or corruption
- App crashes
- Message bridge completely broken

**P1 - High** (should fix before release):
- Fallback doesn't work
- Significant performance issues
- Theme not applied
- Images not loading when expected

**P2 - Medium** (fix in next iteration):
- Minor UI glitches
- Logging issues
- Non-critical error messages
- Documentation gaps

**P3 - Low** (nice to have):
- Code style issues
- Optimization opportunities
- Feature requests

### Regression Testing Strategy

**After Bug Fixes**:
1. Re-run specific test that caught the bug
2. Run full related test suite (unit + integration)
3. Run smoke tests (create note offline)
4. Manual verification on affected platforms

**Before Each Release**:
1. Run full test suite (all unit + integration tests)
2. Run all E2E flows (6 flows documented above)
3. Complete manual testing checklists (Android + iOS)
4. Verify CI build and artifacts

---

## Test Execution Summary

### Pre-Implementation (Current Phase)
- [x] Test strategy documented
- [x] Test cases defined
- [x] Manual checklists created
- [ ] Test data prepared (pending implementation)

### During Implementation (Phase 5)
- [ ] Unit tests written alongside code (TDD approach)
- [ ] Integration tests added after component integration
- [ ] Run tests continuously: `npm run test:watch`

### Post-Implementation (Phase 5)
- [ ] All unit tests passing (100% coverage target)
- [ ] All integration tests passing
- [ ] Manual testing completed (all checklists)
- [ ] Performance benchmarks met
- [ ] Bug tracking active
- [ ] Test report generated

### Pre-Release (Phase 6)
- [ ] Full regression testing
- [ ] CI/CD verification
- [ ] Stakeholder demo/approval
- [ ] Release notes include testing summary
