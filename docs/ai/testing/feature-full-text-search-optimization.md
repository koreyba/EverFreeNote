---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
feature: full-text-search-optimization
---

# Testing Strategy: Full-Text Search Optimization

## Test Coverage Goals
**What level of testing do we aim for?**

- **Unit test coverage**: 100% для новых функций (`lib/supabase/search.js`)
- **Integration test coverage**: Все критичные пути (FTS query, fallback, API endpoint)
- **E2E test coverage**: Основные user flows (search → results → highlighting)
- **Performance testing**: Benchmark FTS vs ILIKE на 10K, 50K, 100K записей

**Alignment with requirements:**
- ✅ Search latency < 100ms → Performance tests
- ✅ FTS используется в 100% случаев → Integration tests
- ✅ Highlighting работает → E2E tests
- ✅ Fallback работает → Integration tests

## Unit Tests
**What individual components need testing?**

### Module: `lib/supabase/search.js`

**Function: `buildTsQuery()`**
- [ ] **Test: Valid single word query**
  - Input: `"hello"`
  - Expected: `"hello:*"`
  - Coverage: Basic functionality

- [ ] **Test: Valid multi-word query**
  - Input: `"hello world"`
  - Expected: `"hello:* & world:*"`
  - Coverage: Word splitting and joining

- [ ] **Test: Query with special FTS characters**
  - Input: `"test & query | special"`
  - Expected: `"test:* & query:* & special:*"`
  - Coverage: Sanitization of FTS operators

- [ ] **Test: Query with extra whitespace**
  - Input: `"  hello   world  "`
  - Expected: `"hello:* & world:*"`
  - Coverage: Whitespace normalization

- [ ] **Test: Empty query throws error**
  - Input: `""`
  - Expected: Error thrown
  - Coverage: Input validation

- [ ] **Test: Null/undefined query throws error**
  - Input: `null`, `undefined`
  - Expected: Error thrown
  - Coverage: Type validation

- [ ] **Test: Query with only special characters**
  - Input: `"!@#$%"`
  - Expected: Error thrown (empty after sanitization)
  - Coverage: Edge case handling

**Function: `searchNotesFTS()`**
- [ ] **Test: Successful FTS search**
  - Setup: Mock Supabase RPC response
  - Input: Valid query, userId
  - Expected: Returns results array, total count, executionTime
  - Coverage: Happy path

- [ ] **Test: FTS search with language parameter**
  - Input: query, userId, `{ language: 'en' }`
  - Expected: Calls RPC with 'english' config
  - Coverage: Language mapping

- [ ] **Test: FTS search with custom options**
  - Input: query, userId, `{ minRank: 0.5, limit: 10, offset: 20 }`
  - Expected: Passes options to RPC
  - Coverage: Options handling

- [ ] **Test: FTS search throws on RPC error**
  - Setup: Mock RPC error
  - Expected: Error thrown
  - Coverage: Error propagation

- [ ] **Test: Empty results handled correctly**
  - Setup: Mock empty RPC response
  - Expected: Returns `{ results: [], total: 0, executionTime }`
  - Coverage: Empty state

**Function: `searchNotesILIKE()`**
- [ ] **Test: Successful ILIKE search**
  - Setup: Mock Supabase query response
  - Input: Valid query, userId
  - Expected: Returns results array, total count, executionTime
  - Coverage: Fallback functionality

- [ ] **Test: ILIKE search with pagination**
  - Input: query, userId, `{ limit: 10, offset: 20 }`
  - Expected: Correct range query
  - Coverage: Pagination

- [ ] **Test: ILIKE search throws on DB error**
  - Setup: Mock DB error
  - Expected: Error thrown
  - Coverage: Error handling

### Module: `app/api/notes/search/route.js`

**API Endpoint: GET /api/notes/search**
- [ ] **Test: Returns 401 if not authenticated**
  - Setup: No user session
  - Expected: 401 Unauthorized
  - Coverage: Auth validation

- [ ] **Test: Returns empty results for empty query**
  - Input: `?q=`
  - Expected: `{ results: [], total: 0 }`
  - Coverage: Empty query handling

- [ ] **Test: Successful FTS search**
  - Setup: Mock searchNotesFTS success
  - Input: `?q=test&lang=ru`
  - Expected: Results with `method: 'fts'`
  - Coverage: FTS path

- [ ] **Test: Fallback to ILIKE on FTS error**
  - Setup: Mock searchNotesFTS throws, searchNotesILIKE succeeds
  - Input: `?q=test`
  - Expected: Results with `method: 'ilike'`
  - Coverage: Fallback logic

- [ ] **Test: Returns 500 on complete failure**
  - Setup: Both FTS and ILIKE throw
  - Expected: 500 Internal Server Error
  - Coverage: Error handling

## Integration Tests
**How do we test component interactions?**

### Integration: API → Database FTS

- [ ] **Test: FTS search returns ranked results**
  - Setup: Create test notes with varying relevance
  - Action: Search for keyword
  - Expected: Results ordered by rank DESC
  - Coverage: FTS ranking works

- [ ] **Test: FTS search with Russian stemming**
  - Setup: Create note with "бежать", "бегу", "бежал"
  - Action: Search for "бег" with lang=ru
  - Expected: All variants found
  - Coverage: Russian stemming

- [ ] **Test: FTS search with English stemming**
  - Setup: Create note with "running", "ran", "runner"
  - Action: Search for "run" with lang=en
  - Expected: All variants found
  - Coverage: English stemming

- [ ] **Test: FTS search with Ukrainian fallback**
  - Setup: Create note in Ukrainian
  - Action: Search with lang=uk
  - Expected: Results found (using russian config)
  - Coverage: Ukrainian language support

- [ ] **Test: Highlighting includes search terms**
  - Setup: Create note with "This is a test note"
  - Action: Search for "test"
  - Expected: Headline contains `<mark>test</mark>`
  - Coverage: ts_headline works

- [ ] **Test: Min rank filters low-relevance results**
  - Setup: Create notes with high and low relevance
  - Action: Search with minRank=0.5
  - Expected: Only high-relevance results returned
  - Coverage: Rank filtering

- [ ] **Test: Pagination works correctly**
  - Setup: Create 50 matching notes
  - Action: Search with limit=10, offset=20
  - Expected: Returns notes 21-30
  - Coverage: Pagination

### Integration: API Fallback Logic

- [ ] **Test: Invalid FTS query triggers fallback**
  - Setup: Inject FTS error (e.g., invalid language)
  - Action: Search
  - Expected: ILIKE results returned, method='ilike'
  - Coverage: Fallback on FTS error

- [ ] **Test: Fallback results match ILIKE behavior**
  - Setup: Create test notes
  - Action: Trigger fallback
  - Expected: Results match ILIKE query
  - Coverage: Fallback correctness

## End-to-End Tests
**What user flows need validation?**

### E2E Flow 1: Basic Search

- [ ] **Test: User searches and sees highlighted results**
  - Steps:
    1. Login as user
    2. Create note with "Important meeting notes"
    3. Search for "meeting"
    4. Verify results appear
    5. Verify "meeting" is highlighted in preview
  - Coverage: Complete search flow

### E2E Flow 2: Multi-language Search

- [ ] **Test: User searches in different languages**
  - Steps:
    1. Create notes in Russian, English, Ukrainian
    2. Search in Russian → verify Russian results
    3. Search in English → verify English results
    4. Search in Ukrainian → verify Ukrainian results
  - Coverage: Language detection and stemming

### E2E Flow 3: Empty Results

- [ ] **Test: User searches for non-existent term**
  - Steps:
    1. Login as user
    2. Search for "xyzabc123notfound"
    3. Verify "No results found" message
    4. Verify no errors in console
  - Coverage: Empty state handling

### E2E Flow 4: Performance

- [ ] **Test: Search is fast with many notes**
  - Steps:
    1. Generate 10,000 test notes
    2. Search for common term
    3. Measure response time
    4. Verify < 100ms
  - Coverage: Performance requirement

### E2E Flow 5: Fallback Transparency

- [ ] **Test: User doesn't notice fallback**
  - Steps:
    1. Trigger FTS error (simulate)
    2. Search still returns results
    3. Verify no error messages shown to user
  - Coverage: Graceful degradation

## Test Data
**What data do we use for testing?**

**Test fixtures:**
```javascript
// tests/fixtures/notes.js
export const testNotes = [
  {
    title: 'Meeting Notes',
    content: 'Important meeting about project planning',
    tags: ['work', 'meeting']
  },
  {
    title: 'Заметки о встрече',
    content: 'Важная встреча по планированию проекта',
    tags: ['работа', 'встреча']
  },
  {
    title: 'Running Tips',
    content: 'Tips for running faster: run regularly, runner should train',
    tags: ['fitness', 'running']
  }
];
```

**Seed data for integration tests:**
```sql
-- tests/seed/fts-test-data.sql
INSERT INTO notes (user_id, title, content, tags) VALUES
  ('test-user-id', 'Test Note 1', 'Content with keyword', ARRAY['tag1']),
  ('test-user-id', 'Test Note 2', 'Another keyword here', ARRAY['tag2']),
  -- ... more test data
```

**Performance test data:**
```bash
# Generate large dataset
node scripts/generate-test-notes.js --count 10000 --user test-user-id
```

## Test Reporting & Coverage
**How do we verify and communicate test results?**

**Coverage commands:**
```bash
# Run all tests with coverage
npm run test -- --coverage

# Run specific test suites
npm run test:unit -- lib/supabase/search.test.js
npm run test:integration -- tests/integration/fts.test.js
npm run test:e2e -- cypress/e2e/search.cy.js
```

**Coverage thresholds:**
```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 100,
      "functions": 100,
      "lines": 100,
      "statements": 100
    },
    "lib/supabase/search.js": {
      "branches": 100,
      "functions": 100,
      "lines": 100,
      "statements": 100
    }
  }
}
```

**Coverage gaps:**
- Если coverage < 100%, документировать причину:
  - Unreachable code (defensive programming)
  - External dependencies (mocked in tests)
  - Error paths (tested manually)

**Test reports:**
- Unit tests: Jest HTML report → `coverage/index.html`
- E2E tests: Cypress dashboard
- Performance: Custom report → `docs/PERFORMANCE_TEST_RESULTS.md`

## Manual Testing
**What requires human validation?**

**UI/UX testing checklist:**
- [ ] Search input accepts text smoothly (no lag)
- [ ] Results appear quickly (< 100ms perceived)
- [ ] Highlighting is visible and clear
- [ ] Empty state shows helpful message
- [ ] Loading state shows spinner
- [ ] Pagination works (if implemented)
- [ ] Mobile: Search works on small screens
- [ ] Accessibility: Screen reader announces results

**Browser compatibility:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Smoke tests after deployment:**
- [ ] Search returns results in production
- [ ] Highlighting works in production
- [ ] No console errors
- [ ] Performance acceptable (< 100ms)

## Performance Testing
**How do we validate performance?**

**Performance test script:**
```javascript
// tests/performance/search-benchmark.js
async function benchmarkSearch() {
  const queries = ['test', 'meeting', 'important', 'project'];
  const results = [];
  
  for (const query of queries) {
    const start = Date.now();
    await fetch(`/api/notes/search?q=${query}`);
    const duration = Date.now() - start;
    results.push({ query, duration });
  }
  
  const avg = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log('Average search time:', avg, 'ms');
  
  // Assert performance
  expect(avg).toBeLessThan(100);
}
```

**Load testing scenarios:**
- [ ] **Scenario 1**: 10 concurrent users searching
  - Expected: < 200ms p95 latency
- [ ] **Scenario 2**: 100 concurrent users searching
  - Expected: < 500ms p95 latency
- [ ] **Scenario 3**: 1000 notes per user
  - Expected: < 100ms search time

**Stress testing:**
- [ ] Search with 100K notes → measure latency
- [ ] Search with 1M notes → measure latency
- [ ] Concurrent searches → measure throughput

**Performance benchmarks:**
```markdown
## FTS Performance Results

| Dataset Size | FTS (ms) | ILIKE (ms) | Speedup |
|--------------|----------|------------|---------|
| 1K notes     | 15       | 50         | 3.3x    |
| 10K notes    | 45       | 520        | 11.6x   |
| 50K notes    | 120      | 2800       | 23.3x   |
| 100K notes   | 250      | 5500       | 22.0x   |
```

## Bug Tracking
**How do we manage issues?**

**Issue tracking:**
- GitHub Issues для bug reports
- Labels: `bug`, `fts`, `search`, `performance`
- Priority: `P0` (critical), `P1` (high), `P2` (medium), `P3` (low)

**Bug severity levels:**
- **P0 Critical**: Search completely broken → hotfix immediately
- **P1 High**: Fallback not working → fix within 24h
- **P2 Medium**: Highlighting broken → fix in next sprint
- **P3 Low**: Minor UI issues → backlog

**Regression testing:**
- Run full test suite before each deploy
- Monitor fallback rate in production (should be < 5%)
- Alert if search latency > 200ms (p95)

