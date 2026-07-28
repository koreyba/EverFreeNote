#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const {
  cloneDefaultStatusState,
  readReportsIndex,
  readStatusState,
  renderComment,
  selectLatestReports,
} = require("./render-pr-status-comment");
const { parseArgs } = require("./allure-pages-utils");

const normalize = (value) => `${value ?? ""}`.trim();
const normalizeSha = (value) => normalize(value).toLowerCase();
const VALID_STATUS_KEYS = new Set(["unit", "component", "e2e"]);

const runGh = (args) => {
  const output = execFileSync("gh", args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return output.trim();
};

const readExistingComment = ({ repository, prNumber }) => {
  const endpoint = `repos/${repository}/issues/${prNumber}/comments?per_page=100`;
  const comments = JSON.parse(runGh(["api", endpoint]));
  return comments.find((comment) =>
    comment?.user?.login === "github-actions[bot]" &&
    `${comment.body ?? ""}`.includes("<!-- everfreenote-pr-status-comment -->")
  ) || null;
};

const updateComment = ({ repository, prNumber, commentId, body }) => {
  const endpoint = commentId
    ? `repos/${repository}/issues/comments/${commentId}`
    : `repos/${repository}/issues/${prNumber}/comments`;
  const method = commentId ? "PATCH" : "POST";

  runGh([
    "api",
    "--method",
    method,
    endpoint,
    "--raw-field",
    `body=${body}`,
  ]);
};

const main = () => {
  const args = parseArgs(process.argv);
  const repository = normalize(args.repository || process.env.GITHUB_REPOSITORY);
  const prNumber = normalize(args["pr-number"] || process.env.PR_NUMBER);
  const headSha = normalizeSha(args["head-sha"] || process.env.COMMIT_SHA || process.env.GITHUB_SHA);
  const statusKey = normalize(args["status-key"]);
  const status = normalize(args.status).toLowerCase();
  const runId = normalize(args["run-id"] || process.env.RUN_ID || process.env.GITHUB_RUN_ID);

  if (!repository || !prNumber || !headSha) {
    throw new Error("repository, pr-number, and head-sha are required");
  }
  if (statusKey && !VALID_STATUS_KEYS.has(statusKey)) {
    throw new Error(`Unsupported status-key: ${statusKey}`);
  }

  const existingComment = readExistingComment({ repository, prNumber });
  let statusState = existingComment
    ? readStatusState(existingComment.body)
    : cloneDefaultStatusState();

  if (statusState.headSha && statusState.headSha !== headSha) {
    statusState = cloneDefaultStatusState();
  }
  statusState.headSha = headSha;

  if (statusKey) {
    if (!status) {
      throw new Error("status is required when status-key is provided");
    }
    if (runId && !/^\d+$/.test(runId)) {
      throw new Error(`Invalid run-id: ${runId}`);
    }
    statusState.statuses[statusKey] = status;
    if (runId) {
      statusState.runs[statusKey] = { runId };
    }
  }

  const reportsIndexPath = args["reports-index"];
  const reports = readReportsIndex(reportsIndexPath && path.resolve(reportsIndexPath));
  const { latestReport, reportsByWorkflow } = selectLatestReports(reports, prNumber, headSha);
  const body = renderComment({
    catalogUrl: args["catalog-url"] || "",
    headSha,
    prNumber,
    latestReport,
    reportsByWorkflow,
    repository,
    statusState,
  });

  updateComment({
    repository,
    prNumber,
    commentId: existingComment?.id,
    body,
  });

  console.log(`${existingComment ? "Updated" : "Created"} PR status comment for ${repository}#${prNumber}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
