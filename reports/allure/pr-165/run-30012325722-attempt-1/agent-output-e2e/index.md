# Allure Report – Pull request #165

- Format: Allure Agent Markdown
- Generated: 2026-07-23T13:46:47.110Z
- Report UUID: d8bca86c-c4ff-4946-a6f0-ec9886182954
- Phase: done
- Exit Code: 0
- Command: npm run test

## Run Summary

- total: 20
- failed: 0
- broken: 0
- unknown: 0
- skipped: 0
- passed: 20
- retries: 0
- flaky: 0
- total duration: 2m 4s
- average duration: 6s 230ms
- max duration: 26s 150ms

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

- Goal: Web E2E Tests
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

- [stdout.txt](artifacts/global/stdout.txt) (text/plain, 749 bytes)

## Failed / Broken

None

## Unknown / Skipped

None

## Passed

- [notes.bulk-delete.spec.ts:38:7](tests/default/12ba66b5b7cda4eb989b2286cbc8e3f1.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 6s 775ms | retries: 0 | scope: unknown | findings: 0
- [notes.bulk-delete.spec.ts:38:7](tests/default/12ba66b5b7cda4eb989b2286cbc8e3f1.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 8s 788ms | retries: 0 | scope: unknown | findings: 0
- [notes.copy.spec.ts:34:7](tests/default/98b54a7caad5380ae053119d58a02567.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 6s 562ms | retries: 0 | scope: unknown | findings: 0
- [notes.copy.spec.ts:34:7](tests/default/98b54a7caad5380ae053119d58a02567.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 9s 579ms | retries: 0 | scope: unknown | findings: 0
- [notes.export-import.spec.ts:52:7](tests/default/6730146c747bb2505abaaf9c378afbc1.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 20s 638ms | retries: 0 | scope: unknown | findings: 0
- [notes.export-import.spec.ts:52:7](tests/default/6730146c747bb2505abaaf9c378afbc1.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 26s 150ms | retries: 0 | scope: unknown | findings: 0
- [notes.search.spec.ts:72:7](tests/default/43a17d76685064f22685bad83d760300.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 6s 261ms | retries: 0 | scope: unknown | findings: 0
- [notes.search.spec.ts:72:7](tests/default/43a17d76685064f22685bad83d760300.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 6s 490ms | retries: 0 | scope: unknown | findings: 0
- [notes.share.spec.ts:43:7](tests/default/461a8ef2d14ff4e40caad81661de0732.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 5s 344ms | retries: 0 | scope: unknown | findings: 0
- [notes.share.spec.ts:43:7](tests/default/461a8ef2d14ff4e40caad81661de0732.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 5s 922ms | retries: 0 | scope: unknown | findings: 0
- [notes.spec.ts:40:7](tests/default/d91650e5340c653be42f92447e3de04f.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 3s 501ms | retries: 0 | scope: unknown | findings: 0
- [notes.spec.ts:40:7](tests/default/d91650e5340c653be42f92447e3de04f.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 4s 119ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:30:7](tests/default/6e8e48d340d1240977dc2171a36a1f1a.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 1s 907ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:30:7](tests/default/6e8e48d340d1240977dc2171a36a1f1a.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 1s 621ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:4:7](tests/default/f95e6ae4e8284004c707237243d4b549.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 938ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:4:7](tests/default/f95e6ae4e8284004c707237243d4b549.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 1s 196ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:61:7](tests/default/4582121c3603117bef07b794debff9ff.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 3s 526ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:61:7](tests/default/4582121c3603117bef07b794debff9ff.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 2s 410ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:92:7](tests/default/0c6c89843a7591b743f9fec0678b05dc.b444eb0fbe6390c71e68b51dd25701fc.md) | status: PASSED | env: default | duration: 1s 719ms | retries: 0 | scope: unknown | findings: 0
- [settings-a11y.spec.ts:92:7](tests/default/0c6c89843a7591b743f9fec0678b05dc.5bd835b0d6b1d4ada3b9f0db936e82c8.md) | status: PASSED | env: default | duration: 1s 160ms | retries: 0 | scope: unknown | findings: 0
