const test = require("node:test");
const assert = require("node:assert/strict");

const {
  COMMENT_MARKER,
  renderComment,
  selectLatestReports,
} = require("./render-allure-pr-comment");

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

test("renderComment includes fallback states for families without published reports", () => {
  const reportsByFamily = new Map([
    ["unit", { url: "https://example.test/unit" }],
    ["component", null],
    ["e2e", null],
  ]);
  const workflowRuns = [
    {
      family: "unit",
      conclusion: "success",
      html_url: "https://github.com/example/actions/runs/1",
    },
    {
      family: "component",
      conclusion: "failure",
      html_url: "https://github.com/example/actions/runs/2",
    },
    {
      family: "e2e",
      conclusion: "success",
      html_url: "https://github.com/example/actions/runs/3",
    },
  ];

  const body = renderComment({
    catalogUrl: "https://example.test/reports",
    headSha: "abcdef123456",
    prNumber: "112",
    reportsByFamily,
    workflowRuns,
    updatedAt: "2026-05-04T11:00:00Z",
  });

  assert.match(body, new RegExp(COMMENT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /\| Unit \| \[Passed\]\(https:\/\/github\.com\/example\/actions\/runs\/1\) \| \[Open report\]\(https:\/\/example\.test\/unit\) \|/);
  assert.match(body, /\| Component \| \[Failed\]\(https:\/\/github\.com\/example\/actions\/runs\/2\) \| Not published \|/);
  assert.match(body, /Catalog: \[All reports\]\(https:\/\/example\.test\/reports\)/);
});
