# Allure Report – Pull request #165

- Format: Allure Agent Markdown
- Generated: 2026-07-23T13:29:07.772Z
- Report UUID: e24007a7-2c11-4375-989b-b6919fa25773
- Phase: done
- Exit Code: 0
- Command: npm run test:integration:core --verbose --ci --json --outputFile=core-integration-results.json

## Run Summary

- total: 20
- failed: 0
- broken: 0
- unknown: 0
- skipped: 0
- passed: 20
- retries: 0
- flaky: 0
- total duration: 64ms
- average duration: 3ms
- max duration: 23ms

## Environment Summary

- default: 20 total (0 failed, 0 broken, 0 unknown, 0 skipped, 20 passed)

## Runtime Modeling Summary

- completeness: complete
- visible results from stats: 20
- logical tests rendered: 20
- unmodeled visible results: 0 total (0 failed, 0 broken, 0 unknown, 0 skipped, 0 passed)
- runner failures outside logical tests: 0
- actionable stderr signals: 0
- repeated low-value warnings: 0

### High-Signal Runner Issues

None

### Repeated Low-Value Warnings

None

## Human Report

- Status: disabled
- Mode: off
- Result Count: unknown
- Threshold: 1000
- Reason: disabled by --report off

## Expected Scope

- Goal: Core Integration Tests
- Feature / Task: unknown
- Expectations Source: CLI options (normalized: [manifest/expected.json](manifest/expected.json))
- Expected selectors: None
- Forbidden selectors: None
- Evidence expectations: None

## Expectation Result

- Status: not_requested
- Impact: advisory
- Recognized Controls: 1
- Source: inline
- Expected Tests: 0
- Observed Tests: 20
- Missing Expected: 0
- Forbidden Observed: 0
- Evidence Mismatches: 0
- Run Manifest: [manifest/run.json](manifest/run.json)
- Findings Manifest: [manifest/findings.jsonl](manifest/findings.jsonl)

## Advisory Check Summary

- modeling completeness: complete
- total findings: 0
- high: 0
- warning: 0
- info: 0
- bootstrap: 0
- scope: 0
- metadata: 0
- evidence: 0
- smells: 0

## Needs Attention First

None

## Process Logs

- [stdout.txt](artifacts/global/stdout.txt) (text/plain, 158 bytes)
- [stderr.txt](artifacts/global/stderr.txt) (text/plain, 1419 bytes)

## Failed / Broken

None

## Unknown / Skipped

None

## Passed

- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Batch sync workflow processes multiple mutations in order](tests/default/a4b08d53d1982634abc5d500b069f435.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Cache size management enforces cache limit and removes oldest notes](tests/default/9f71ccf348d8ade50f6e2a2fbed511ff.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Conflict resolution workflow handles server-client conflicts during sync](tests/default/e8a913ca1a73b59be77650c195f92dfa.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Create note offline workflow saves note to cache and queues mutation](tests/default/4d56d8fbb4a9ad990916f4533023da98.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 23ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Delete note offline workflow removes from cache and enqueues delete mutation](tests/default/ec55f732bb1f05a0da7c40c15ea50dbc.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Queue compaction compacts multiple updates to same note](tests/default/90913f3690b6658fc87ccdaf00305754.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Recovery from failed sync retries failed mutations with exponential backoff](tests/default/96ea77f5c8adca98feca6cb5db8cd1c6.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/offlineSync.test.ts#Offline Sync Integration Update note offline workflow updates cache and enqueues update mutation](tests/default/ad370c2d01337156442a8c222caf5bfe.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration converts AI chat markdown fixture to formatted HTML](tests/default/9d719949ee6cb386300d43f55b7373c1.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 18ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration converts plain text fixture to paragraphs and line breaks](tests/default/fdc6aca5a518f4ed591b00e1f85b03ae.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration escapes raw HTML when content is treated as plain text](tests/default/776eee9aa82be01ba5ededd03c56df18.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration falls back to plain text and strips scripts from non-structural HTML](tests/default/a789fc211dd3f34a22a9f471043b3def.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration forced markdown - force-markdown.txt fixture auto-detects fixture as plain (confirms low markdown score)](tests/default/daebb3c5885bdce2d883bdcf20b5c6ef.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 0s | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration forced markdown - force-markdown.txt fixture renders fixture as markdown when forcedType is provided](tests/default/1351e56496d008b3f4921d36533d6398.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration handles unclosed fenced code blocks without crashing](tests/default/fb691697bee8cd602a6dfd14be0262a0.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration keeps http images from web article HTML fixture](tests/default/fadb88a253738d309d1cfb1fd5cb1c67.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration keeps mixed markdown lists and headings](tests/default/cff755023326850c4866b09f77b2324e.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration renders markdown horizontal rule as hr](tests/default/bd628159b83500a220c24faf31a4b880.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 1ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration sanitizes Google Docs HTML fixture](tests/default/095a8a0b802dcce3232f43a28bd8afff.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
- [everfreenote:core/tests/integration/smartPaste.integration.test.ts#smartPaste integration wraps non-structural HTML content into paragraphs](tests/default/83c9e688d8bafd0abe47db6150ccc323.d41d8cd98f00b204e9800998ecf8427e.md) | status: PASSED | env: default | duration: 2ms | retries: 0 | scope: unknown | findings: 0
