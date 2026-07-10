const test = require("node:test");
const assert = require("node:assert/strict");

const {
  COMMENT_MARKER,
  renderComment,
  selectLatestReports,
} = require("./render-pr-status-comment");

test("selectLatestReports keeps the newest report and groups by workflow for the active PR head sha", () => {
  const reports = [
    {
      family: "allure",
      workflow: "Unit Tests",
      prNumber: 112,
      sha: "abcdef123456",
      url: "https://example.test/unit-old",
      generatedAt: "2026-05-04T10:00:00Z",
      runId: "100",
      runAttempt: "1",
      suiteLabels: ["Web Unit"],
    },
    {
      family: "allure",
      workflow: "Unit Tests",
      prNumber: 112,
      sha: "abcdef123456",
      url: "https://example.test/unit-new",
      generatedAt: "2026-05-04T10:05:00Z",
      runId: "101",
      runAttempt: "1",
      suiteLabels: ["Web Unit", "Core Unit"],
    },
    {
      family: "allure",
      workflow: "Component Tests",
      prNumber: 112,
      sha: "different",
      url: "https://example.test/component-stale",
      generatedAt: "2026-05-04T10:06:00Z",
      runId: "102",
      runAttempt: "1",
      suiteLabels: ["Component"],
    },
  ];

  const { latestReport, reportsByWorkflow } = selectLatestReports(reports, "112", "abcdef123456");

  assert.equal(latestReport?.url, "https://example.test/unit-new");
  assert.equal(reportsByWorkflow.get("Unit Tests")?.url, "https://example.test/unit-new");
  assert.equal(reportsByWorkflow.get("Component Tests"), null);
  assert.equal(reportsByWorkflow.get("E2E Tests (PR Preview)"), null);
});

test("renderComment uses a generic PR status marker, single report link, and workflow status table", () => {
  const reportsByWorkflow = new Map([
    [
      "Unit Tests",
      {
        runId: "1",
        runAttempt: "1",
        url: "https://example.test/allure",
        workflow: "Unit Tests",
        suiteLabels: ["Core Unit", "Web Unit"],
      },
    ],
    ["Component Tests", null],
    ["E2E Tests (PR Preview)", null],
  ]);

  const latestReport = {
    url: "https://example.test/allure",
  };

  const body = renderComment({
    catalogUrl: "https://example.test/reports",
    headSha: "abcdef123456",
    prNumber: "112",
    latestReport,
    reportsByWorkflow,
    repository: "koreyba/EverFreeNote",
    updatedAt: "2026-05-04T11:00:00Z",
  });

  assert.match(body, new RegExp(COMMENT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /## PR Status/);
  assert.match(body, /### 📊 Allure Test Report/);
  assert.match(body, /\[Open Allure Report\]\(https:\/\/example\.test\/allure\)/);
  assert.match(body, /\| Unit Tests \| \[Workflow run #1 \(Attempt #1\)\]\(https:\/\/github\.com\/koreyba\/EverFreeNote\/actions\/runs\/1\) \| Core Unit, Web Unit \|/);
  assert.match(body, /\| Component Tests \| \*Waiting for run\.\.\.\* \| - \|/);
  assert.match(body, /Catalog: \[All reports\]\(https:\/\/example\.test\/reports\)/);
});

test("renderComment escapes table cells and refuses unsafe URLs", () => {
  const reportsByWorkflow = new Map([
    [
      "Unit Tests",
      {
        runId: "1",
        runAttempt: "1",
        url: "javascript:alert(1)",
        workflow: "Unit | Tests\nInjected",
        suiteLabels: ["Core | Unit", "Web Unit"],
      },
    ],
    ["Component Tests", null],
    ["E2E Tests (PR Preview)", null],
  ]);

  const latestReport = {
    url: "javascript:alert(1)",
  };

  const body = renderComment({
    catalogUrl: "javascript:alert(2)",
    headSha: "abcdef123456",
    prNumber: "112",
    latestReport,
    reportsByWorkflow,
    repository: "koreyba/EverFreeNote",
    updatedAt: "2026-05-04T11:00:00Z",
  });

  assert.doesNotMatch(body, /\]\(javascript:/);
  assert.match(body, /Core \\\| Unit, Web Unit/);
  assert.match(body, /Catalog: All reports/);
});
