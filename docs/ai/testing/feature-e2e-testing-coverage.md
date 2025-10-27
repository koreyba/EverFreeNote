---
phase: testing
title: Testing Strategy & Test Cases
description: How do we verify it works?
---

# Testing Strategy & Test Cases

## Testing Approach
**How do we test this feature?**

### Test Pyramid for E2E Testing

```
        /\
       /  \
      / E2E \       ← We are here (7 tests, full flows)
     /______\
    /        \
   / Integration \  ← Component tests (233 tests)
  /______________\
 /                \
/   Unit Tests     \ ← Utils tests (15 tests)
/____________________\
```

### E2E Testing Strategy
- **Focus:** User journeys and critical paths
- **Coverage:** 100% of critical user flows
- **Duration:** Each test ≤ 3 minutes
- **Total time:** ≤ 10 minutes

## Test Cases

### 1. Complete Workflow Test
**File:** `cypress/e2e/user-journeys/complete-workflow.cy.js`

**Purpose:** Test full end-to-end user journey

**Test Cases:**
1. ✅ User can login with skip auth
2. ✅ User can create a new note
3. ✅ User can edit existing note
4. ✅ User can search notes
5. ✅ User can filter by tags
6. ✅ User can delete note
7. ✅ User can logout

**Expected Duration:** ~2 minutes

**Success Criteria:**
- All steps complete without errors
- Data persists between steps
- UI updates correctly after each action

---

### 2. Import Workflow Test
**File:** `cypress/e2e/user-journeys/import-workflow.cy.js`

**Purpose:** Test ENEX import functionality

**Test Cases:**
1. ✅ User can open import dialog
2. ✅ User can select ENEX file
3. ✅ User can choose duplicate strategy (prefix)
4. ✅ User can start import
5. ✅ Progress dialog shows correctly
6. ✅ Imported notes appear in list
7. ✅ Imported note content is correct
8. ✅ Duplicate strategy (skip) works

**Expected Duration:** ~3 minutes

**Success Criteria:**
- Import completes successfully
- All notes imported correctly
- Duplicate handling works as expected

---

### 3. Tags Management Test
**File:** `cypress/e2e/critical-paths/tags-management.cy.js`

**Purpose:** Test tags functionality

**Test Cases:**
1. ✅ User can create notes with tags
2. ✅ User can filter by single tag
3. ✅ User can remove tag from note
4. ✅ User can add tag to existing note
5. ✅ Tag filtering updates note list correctly

**Expected Duration:** ~2 minutes

**Success Criteria:**
- Tags are saved correctly
- Filtering works as expected
- Tag CRUD operations work

---

### 4. Infinite Scroll Test
**File:** `cypress/e2e/critical-paths/infinite-scroll.cy.js`

**Purpose:** Test pagination with many notes

**Test Cases:**
1. ✅ Create 50+ notes
2. ✅ Scroll down triggers lazy loading
3. ✅ All notes eventually loaded
4. ✅ Search works with large dataset

**Expected Duration:** ~3 minutes

**Success Criteria:**
- Lazy loading works correctly
- No performance issues
- Search still fast with many notes

---

### 5. Notes CRUD Test
**File:** `cypress/e2e/critical-paths/notes-crud.cy.js`

**Purpose:** Extended CRUD operations

**Test Cases:**
1. ✅ Create multiple notes
2. ✅ Edit note title
3. ✅ Edit note content
4. ✅ Edit note tags
5. ✅ Delete note
6. ✅ Full lifecycle (create → edit → delete)

**Expected Duration:** ~2 minutes

**Success Criteria:**
- All CRUD operations work
- Data persists correctly
- UI updates after each operation

---

### 6. Search Integration Test
**File:** `cypress/e2e/integration/search-integration.cy.js`

**Purpose:** Test search UI and filters

**Test Cases:**
1. ✅ Search by title
2. ✅ Search by content
3. ✅ Search highlights results
4. ✅ Combine search with tag filter
5. ✅ Clear search works

**Expected Duration:** ~2 minutes

**Success Criteria:**
- Search returns correct results
- Highlighting works
- Filters combine correctly

---

### 7. Theme Workflow Test
**File:** `cypress/e2e/user-journeys/theme-workflow.cy.js`

**Purpose:** Test theme switching

**Test Cases:**
1. ✅ Toggle to dark theme
2. ✅ Dark theme applied correctly
3. ✅ Theme persists after logout/login
4. ✅ Toggle back to light theme

**Expected Duration:** ~1 minute

**Success Criteria:**
- Theme changes immediately
- Theme persists in localStorage
- No visual glitches

---

## Test Data

### Fixtures

#### notes/simple-note.json
```json
{
  "title": "Simple Test Note",
  "content": "This is a simple test note content",
  "tags": "test, simple"
}
```

#### notes/rich-text-note.json
```json
{
  "title": "Rich Text Note",
  "content": "This note has **bold** and *italic* text",
  "tags": "test, rich-text"
}
```

#### notes/tagged-notes.json
```json
[
  {
    "title": "Work Note",
    "content": "Work related content",
    "tags": "work, important"
  },
  {
    "title": "Personal Note",
    "content": "Personal content",
    "tags": "personal"
  },
  {
    "title": "Ideas Note",
    "content": "Ideas and thoughts",
    "tags": "ideas, brainstorming"
  }
]
```

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Next.js app running on localhost:3000
- [ ] Supabase accessible
- [ ] Test database clean (or use separate test DB)

### Test Execution
- [ ] Run all e2e tests: `npm run test:e2e`
- [ ] Check all tests pass
- [ ] Verify execution time ≤ 10 minutes
- [ ] Check for flaky tests (run 3 times)

### Post-Test Verification
- [ ] Review screenshots (if any failures)
- [ ] Check videos (if enabled)
- [ ] Verify no console errors
- [ ] Clean up test data

## Automated Testing

### CI/CD Pipeline
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

### Test Commands
```bash
# Run all e2e tests
npm run test:e2e

# Run specific test file
npx cypress run --spec "cypress/e2e/user-journeys/complete-workflow.cy.js"

# Open Cypress UI
npx cypress open --e2e

# Run with specific browser
npx cypress run --browser chrome

# Run with video recording
npx cypress run --video
```

## Test Coverage Report

### Expected Coverage

| Feature | E2E Coverage | Component Coverage | Total |
|---------|-------------|-------------------|-------|
| Authentication | ✅ Full flow | ✅ UI only | 100% |
| Notes CRUD | ✅ Full flow | ✅ UI only | 100% |
| Rich Text | ✅ Integration | ✅ Full | 100% |
| Search | ✅ UI + filters | ✅ Component | 100% |
| Tags | ✅ Full flow | ✅ UI only | 100% |
| Import | ✅ Full flow | ✅ UI only | 100% |
| Theme | ✅ Full flow | ✅ UI only | 100% |
| Infinite Scroll | ✅ Full flow | ⏭️ Skipped | 100% |

### Coverage Gaps (Intentional)
- ❌ Google OAuth (complex to test in e2e)
- ❌ Offline mode (if exists, separate task)
- ❌ Visual regression (separate task)
- ❌ Accessibility (separate task)

## Performance Benchmarks

### Target Metrics
- Each test: ≤ 3 minutes
- Total execution: ≤ 10 minutes
- Page load: ≤ 5 seconds
- API response: ≤ 2 seconds

### Actual Metrics (to be filled after implementation)
- [ ] complete-workflow: ___ minutes
- [ ] import-workflow: ___ minutes
- [ ] tags-management: ___ minutes
- [ ] infinite-scroll: ___ minutes
- [ ] notes-crud: ___ minutes
- [ ] search-integration: ___ minutes
- [ ] theme-workflow: ___ minutes
- [ ] **Total:** ___ minutes

## Regression Testing

### When to Run E2E Tests
1. ✅ Before every commit (local)
2. ✅ On every PR (CI/CD)
3. ✅ Before release (manual)
4. ✅ After deployment (smoke tests)

### Smoke Tests (Critical Path)
If time is limited, run these tests only:
1. complete-workflow.cy.js (main flow)
2. notes-crud.cy.js (CRUD operations)
3. search-integration.cy.js (search feature)

## Test Maintenance

### When to Update Tests
- ✅ UI changes (selectors change)
- ✅ Feature changes (flow changes)
- ✅ New features added
- ✅ Bug fixes (add regression test)

### Test Review Checklist
- [ ] Tests follow Page Object pattern
- [ ] No code duplication
- [ ] Clear test descriptions
- [ ] Proper assertions
- [ ] No flaky tests
- [ ] Execution time within limits

## Success Criteria

### Functional Requirements
- [x] All critical user flows covered
- [x] No duplication with component tests
- [x] Page Object pattern used
- [x] Custom commands for common actions
- [x] Fixtures for test data

### Non-Functional Requirements
- [ ] Each test ≤ 3 minutes
- [ ] Total execution ≤ 10 minutes
- [ ] 0 flaky tests
- [ ] Clear documentation
- [ ] Easy to add new tests

## Known Issues & Limitations

### Current Limitations
1. **Google OAuth:** Cannot test in e2e (requires real OAuth flow)
2. **File Upload:** Limited by Cypress file upload capabilities
3. **Network Conditions:** Cannot easily test slow network
4. **Browser Compatibility:** Only testing in Electron/Chrome

### Future Improvements
- [ ] Add visual regression testing
- [ ] Add accessibility testing
- [ ] Add performance testing
- [ ] Test in multiple browsers
- [ ] Test on mobile viewports

## Test Results Template

### Test Run: [Date]
**Environment:** Local / CI  
**Browser:** Electron / Chrome  
**Duration:** ___ minutes

| Test File | Status | Duration | Notes |
|-----------|--------|----------|-------|
| complete-workflow | ✅/❌ | ___ min | |
| import-workflow | ✅/❌ | ___ min | |
| tags-management | ✅/❌ | ___ min | |
| infinite-scroll | ✅/❌ | ___ min | |
| notes-crud | ✅/❌ | ___ min | |
| search-integration | ✅/❌ | ___ min | |
| theme-workflow | ✅/❌ | ___ min | |

**Total:** ✅ ___ passed, ❌ ___ failed

**Issues Found:**
- [ ] Issue 1: Description
- [ ] Issue 2: Description

**Action Items:**
- [ ] Fix failing tests
- [ ] Optimize slow tests
- [ ] Update documentation

