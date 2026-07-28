#!/usr/bin/env node

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
const GITHUB_API_URL = "https://api.github.com";

const parseRepository = (repository) => {
  const [owner, name, ...extra] = repository.split("/");
  if (
    !owner ||
    !name ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_.-]+$/.test(owner) ||
    !/^[A-Za-z0-9_.-]+$/.test(name)
  ) {
    throw new Error(`Invalid repository: ${repository}`);
  }
  return { owner, name };
};

const githubRequest = async ({ endpoint, method = "GET", body }) => {
  const token = normalize(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  if (!token) {
    throw new Error("GH_TOKEN or GITHUB_TOKEN is required");
  }

  const response = await fetch(`${GITHUB_API_URL}/${endpoint}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();
  let responseBody = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object" && responseBody?.message
        ? responseBody.message
        : responseText || "Unknown GitHub API error";
    throw new Error(
      `GitHub API ${method} ${endpoint} failed (${response.status}): ${message}`,
    );
  }

  return responseBody;
};

const readExistingComment = async ({ repository, prNumber }) => {
  const { owner, name } = parseRepository(repository);
  const endpoint = `repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${prNumber}/comments?per_page=100`;
  const comments = await githubRequest({ endpoint });
  return (
    comments.find(
      (comment) =>
        comment?.user?.login === "github-actions[bot]" &&
        `${comment.body ?? ""}`.includes(
          "<!-- everfreenote-pr-status-comment -->",
        ),
    ) || null
  );
};

const updateComment = async ({ repository, prNumber, commentId, body }) => {
  const { owner, name } = parseRepository(repository);
  const endpoint = commentId
    ? `repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/comments/${commentId}`
    : `repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${prNumber}/comments`;
  const method = commentId ? "PATCH" : "POST";

  await githubRequest({ endpoint, method, body: { body } });
};

const main = async () => {
  const args = parseArgs(process.argv);
  const repository = normalize(
    args.repository || process.env.GITHUB_REPOSITORY,
  );
  const prNumber = normalize(args["pr-number"] || process.env.PR_NUMBER);
  const headSha = normalizeSha(
    args["head-sha"] || process.env.COMMIT_SHA || process.env.GITHUB_SHA,
  );
  const statusKey = normalize(args["status-key"]);
  const status = normalize(args.status).toLowerCase();
  const runId = normalize(
    args["run-id"] || process.env.RUN_ID || process.env.GITHUB_RUN_ID,
  );

  if (!repository || !prNumber || !headSha) {
    throw new Error("repository, pr-number, and head-sha are required");
  }
  parseRepository(repository);
  if (!/^\d+$/.test(prNumber)) {
    throw new Error(`Invalid pull request number: ${prNumber}`);
  }
  if (statusKey && !VALID_STATUS_KEYS.has(statusKey)) {
    throw new Error(`Unsupported status-key: ${statusKey}`);
  }

  const existingComment = await readExistingComment({ repository, prNumber });
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
  const reports = readReportsIndex(
    reportsIndexPath && path.resolve(reportsIndexPath),
  );
  const { latestReport, reportsByWorkflow } = selectLatestReports(
    reports,
    prNumber,
    headSha,
  );
  const body = renderComment({
    catalogUrl: args["catalog-url"] || "",
    headSha,
    prNumber,
    latestReport,
    reportsByWorkflow,
    repository,
    statusState,
  });

  await updateComment({
    repository,
    prNumber,
    commentId: existingComment?.id,
    body,
  });

  console.log(
    `${existingComment ? "Updated" : "Created"} PR status comment for ${repository}#${prNumber}`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
