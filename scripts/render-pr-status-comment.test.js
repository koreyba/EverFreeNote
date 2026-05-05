const test = require("node:test");
const assert = require("node:assert/strict");

const {
  COMMENT_MARKER,
  renderComment,
  selectLatestReports,
} = require("./render-pr-status-comment");

test("selectLatestReports keeps the newest report per family for the active PR head sha", () => {
  const reports = [
    {
      family: "unit",
      prNumber: 112,
      sha: "abcdef123456",
      url: "https://example.test/unit-old",
      generatedAt: "2026-05-04T10:00:00Z",
      runId: "100",
      runAttempt: "1",
    },
    {
      family: "unit",
      prNumber: 112,
      sha: "abcdef123456",
      url: "https://example.test/unit-new",
      generatedAt: "2026-05-04T10:05:00Z",
      runId: "101",
      runAttempt: "1",
    },
    {
      family: "component",
      prNumber: 112,
      sha: "different",
      url: "https://example.test/component-stale",
      generatedAt: "2026-05-04T10:06:00Z",
      runId: "102",
      runAttempt: "1",
    },
  ];

  const reportsByFamily = selectLatestReports(reports, "112", "abcdef123456");

  assert.equal(reportsByFamily.get("unit")?.url, "https://example.test/unit-new");
  assert.equal(reportsByFamily.get("component"), null);
  assert.equal(reportsByFamily.get("e2e"), null);
});

test("renderComment uses a generic PR status marker and report section", () => {
  const reportsByFamily = new Map([
    [
      "unit",
      {
        runId: "1",
        url: "https://example.test/unit",
        workflow: "Unit Tests",
      },
    ],
    ["component", null],
    ["e2e", null],
  ]);

  const body = renderComment({
    catalogUrl: "https://example.test/reports",
    headSha: "abcdef123456",
    prNumber: "112",
    reportsByFamily,
    repository: "koreyba/EverFreeNote",
    updatedAt: "2026-05-04T11:00:00Z",
  });

  assert.match(body, new RegExp(COMMENT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /## PR Status/);
  assert.match(body, /### Test Reports/);
  assert.match(body, /\| Unit \| \[Unit Tests\]\(https:\/\/github\.com\/koreyba\/EverFreeNote\/actions\/runs\/1\) \| \[Open report\]\(https:\/\/example\.test\/unit\) \|/);
  assert.match(body, /\| Component \| Waiting for publish \| Not published yet \|/);
  assert.match(body, /Catalog: \[All reports\]\(https:\/\/example\.test\/reports\)/);
});

test("renderComment escapes table cells and refuses unsafe URLs", () => {
  const reportsByFamily = new Map([
    [
      "unit",
      {
        runId: "1",
        url: "javascript:alert(1)",
        workflow: "Unit | Tests\nInjected",
      },
    ],
    ["component", null],
    ["e2e", null],
  ]);

  const body = renderComment({
    catalogUrl: "javascript:alert(2)",
    headSha: "abcdef123456",
    prNumber: "112",
    reportsByFamily,
    repository: "koreyba/EverFreeNote",
    updatedAt: "2026-05-04T11:00:00Z",
  });

  assert.match(body, /Unit \\\| Tests Injected/);
  assert.doesNotMatch(body, /\]\(javascript:/);
  assert.match(body, /Catalog: All reports/);
});
