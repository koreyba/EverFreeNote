const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCommentBody,
  normalizeReportUrl,
  synchronizeStatusComment,
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

test("a stale workflow cannot reset statuses recorded for the current PR head", async () => {
  const currentHeadSha = "a".repeat(40);
  const staleHeadSha = "b".repeat(40);
  let comment = null;

  const synchronize = async ({
    headSha = currentHeadSha,
    runId,
    status,
    statusKey,
  }) =>
    synchronizeStatusComment({
      ...context,
      headSha,
      readComment: async () => comment,
      readCurrentHeadSha: async () => currentHeadSha,
      runId,
      status,
      statusKey,
      writeComment: async ({ body }) => {
        comment = { body, id: 1 };
      },
    });

  await synchronize({ runId: "300", status: "success", statusKey: "unit" });
  const staleResult = await synchronize({
    headSha: staleHeadSha,
    runId: "299",
    status: "success",
    statusKey: "e2e",
  });
  await synchronize({ runId: "301", status: "success", statusKey: "e2e" });
  await synchronize({
    runId: "300",
    status: "success",
    statusKey: "component",
  });

  assert.equal(staleResult.applied, false);
  assert.equal(staleResult.reason, "stale-head");
  assert.deepEqual(readStatusState(comment.body).statuses, {
    unit: "success",
    component: "success",
    e2e: "success",
  });
  assert.deepEqual(readStatusState(comment.body).runs, {
    unit: { runId: "300" },
    component: { runId: "300" },
    e2e: { runId: "301" },
  });
});

test("a head change immediately before PATCH aborts the comment update", async () => {
  const incomingHeadSha = "a".repeat(40);
  const replacementHeadSha = "b".repeat(40);
  let headReadCount = 0;
  let writeCalled = false;

  const result = await synchronizeStatusComment({
    ...context,
    headSha: incomingHeadSha,
    readComment: async () => null,
    readCurrentHeadSha: async () => {
      headReadCount += 1;
      return headReadCount === 1 ? incomingHeadSha : replacementHeadSha;
    },
    runId: "300",
    status: "success",
    statusKey: "unit",
    writeComment: async () => {
      writeCalled = true;
    },
  });

  assert.equal(result.applied, false);
  assert.equal(result.reason, "head-changed-before-write");
  assert.equal(headReadCount, 2);
  assert.equal(writeCalled, false);
});

test("a GitHub head lookup failure fails closed without writing", async () => {
  let readCommentCalled = false;
  let writeCalled = false;

  await assert.rejects(
    synchronizeStatusComment({
      ...context,
      headSha: "a".repeat(40),
      readComment: async () => {
        readCommentCalled = true;
        return null;
      },
      readCurrentHeadSha: async () => {
        throw new Error("GitHub API unavailable");
      },
      runId: "300",
      status: "success",
      statusKey: "unit",
      writeComment: async () => {
        writeCalled = true;
      },
    }),
    /GitHub API unavailable/,
  );
  assert.equal(readCommentCalled, false);
  assert.equal(writeCalled, false);
});

test("an older run for the same head cannot overwrite a newer status", async () => {
  const headSha = "a".repeat(40);
  const newerBody = buildCommentBody({
    ...context,
    headSha,
    runId: "301",
    status: "success",
    statusKey: "unit",
  });
  let writeCalled = false;

  const result = await synchronizeStatusComment({
    ...context,
    headSha,
    readComment: async () => ({ body: newerBody, id: 1 }),
    readCurrentHeadSha: async () => headSha,
    runId: "300",
    status: "failure",
    statusKey: "unit",
    writeComment: async () => {
      writeCalled = true;
    },
  });

  assert.equal(result.applied, false);
  assert.equal(result.reason, "older-run");
  assert.equal(writeCalled, false);
  assert.equal(readStatusState(newerBody).statuses.unit, "success");
  assert.deepEqual(readStatusState(newerBody).runs.unit, { runId: "301" });
});
