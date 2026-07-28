const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCommentBody,
  normalizeReportUrl,
} = require("./update-pr-status-comment");
const { readStatusState } = require("./render-pr-status-comment");

const context = {
  catalogUrl: "https://koreyba.github.io/EverFreeNote/",
  headSha: "abcdef1234567890",
  prNumber: "172",
  repository: "koreyba/EverFreeNote",
};

test("serialized updates preserve completed suites and add the final Allure link", () => {
  const unitBody = buildCommentBody({
    ...context,
    runId: "100",
    status: "success",
    statusKey: "unit",
  });
  const componentBody = buildCommentBody({
    ...context,
    existingBody: unitBody,
    runId: "100",
    status: "success",
    statusKey: "component",
  });
  const allureBody = buildCommentBody({
    ...context,
    allureUrl:
      "https://koreyba.github.io/EverFreeNote/reports/allure/pr-172/run-100-attempt-1/",
    existingBody: componentBody,
  });
  const e2eBody = buildCommentBody({
    ...context,
    existingBody: allureBody,
    runId: "200",
    status: "success",
    statusKey: "e2e",
  });

  const state = readStatusState(e2eBody);
  assert.deepEqual(state.statuses, {
    unit: "success",
    component: "success",
    e2e: "success",
  });
  assert.deepEqual(state.runs, {
    unit: { runId: "100" },
    component: { runId: "100" },
    e2e: { runId: "200" },
  });
  assert.equal(
    state.allureUrl,
    "https://koreyba.github.io/EverFreeNote/reports/allure/pr-172/run-100-attempt-1/",
  );
  assert.match(
    e2eBody,
    /\[✅ Completed]\(https:\/\/github\.com\/koreyba\/EverFreeNote\/actions\/runs\/100\)/,
  );
  assert.match(
    e2eBody,
    /\[✅ Completed]\(https:\/\/github\.com\/koreyba\/EverFreeNote\/actions\/runs\/200\)/,
  );
});

test("a new head revision resets stale workflow statuses", () => {
  const previousBody = buildCommentBody({
    ...context,
    runId: "100",
    status: "success",
    statusKey: "unit",
  });
  const nextBody = buildCommentBody({
    ...context,
    existingBody: previousBody,
    headSha: "fedcba0987654321",
    runId: "201",
    status: "success",
    statusKey: "component",
  });

  assert.deepEqual(readStatusState(nextBody).statuses, {
    unit: "waiting",
    component: "success",
    e2e: "waiting",
  });
});

test("report links are restricted to the trusted GitHub Pages location", () => {
  assert.equal(normalizeReportUrl(""), "");
  assert.throws(
    () => normalizeReportUrl("https://example.test/private-data"),
    /Invalid report URL/,
  );
  assert.throws(
    () =>
      normalizeReportUrl(
        "https://koreyba.github.io:444/EverFreeNote/private-data",
      ),
    /Invalid report URL/,
  );
});
