#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./allure-pages-utils");

const COMMENT_MARKER = "<!-- everfreenote-pr-status-comment -->";
const REPORT_FAMILIES = ["unit", "component", "e2e"];
const FAMILY_LABELS = {
  component: "Component",
  e2e: "E2E",
  unit: "Unit",
};

const normalizePrNumber = (value) => `${value ?? ""}`.trim();
const normalizeSha = (value) => `${value ?? ""}`.trim().toLowerCase();

const formatDateTime = (value) => {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) {
    return "unknown";
  }
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
};

const compareReports = (left, right) => {
  const leftDate = Date.parse(left?.generatedAt || "") || 0;
  const rightDate = Date.parse(right?.generatedAt || "") || 0;
  if (rightDate !== leftDate) {
    return rightDate - leftDate;
  }

  const leftRunId = Number.parseInt(left?.runId || "0", 10) || 0;
  const rightRunId = Number.parseInt(right?.runId || "0", 10) || 0;
  if (rightRunId !== leftRunId) {
    return rightRunId - leftRunId;
  }

  const leftAttempt = Number.parseInt(left?.runAttempt || "0", 10) || 0;
  const rightAttempt = Number.parseInt(right?.runAttempt || "0", 10) || 0;
  return rightAttempt - leftAttempt;
};

const readReportsIndex = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const rawContents = fs.readFileSync(path.resolve(filePath), "utf8");
  const payload = JSON.parse(rawContents.replace(/^\uFEFF/, ""));
  return Array.isArray(payload) ? payload : [];
};

const selectLatestReports = (reports, prNumber, headSha) => {
  const normalizedPrNumber = normalizePrNumber(prNumber);
  const normalizedHeadSha = normalizeSha(headSha);
  const reportsByFamily = new Map();

  for (const family of REPORT_FAMILIES) {
    const match = reports
      .filter((report) =>
        report?.family === family &&
        normalizePrNumber(report?.prNumber) === normalizedPrNumber &&
        normalizeSha(report?.sha) === normalizedHeadSha
      )
      .sort(compareReports)[0];
    reportsByFamily.set(family, match || null);
  }

  return reportsByFamily;
};

const buildRunUrl = (repository, report) => {
  if (!repository || !report?.runId) {
    return "";
  }
  return `https://github.com/${repository}/actions/runs/${report.runId}`;
};

const buildReportCell = (report) => {
  if (!report?.url) {
    return "Not published yet";
  }
  return `[Open report](${report.url})`;
};

const buildWorkflowCell = (repository, report) => {
  if (!report) {
    return "Waiting for publish";
  }

  const label = report.workflow || "Workflow run";
  const runUrl = buildRunUrl(repository, report);
  return runUrl ? `[${label}](${runUrl})` : label;
};

const renderComment = ({
  catalogUrl,
  headSha,
  prNumber,
  reportsByFamily,
  repository,
  updatedAt = new Date().toISOString(),
}) => {
  const lines = [
    COMMENT_MARKER,
    "## PR Status",
    "",
    `Updated for PR #${prNumber} at \`${normalizeSha(headSha).slice(0, 7) || "unknown"}\` on ${formatDateTime(updatedAt)}.`,
    "",
    "### Test Reports",
    "",
    "| Family | Source | Report |",
    "|---|---|---|",
  ];

  for (const family of REPORT_FAMILIES) {
    const report = reportsByFamily.get(family) || null;
    lines.push(
      `| ${FAMILY_LABELS[family] || family} | ${buildWorkflowCell(repository, report)} | ${buildReportCell(report)} |`
    );
  }

  if (catalogUrl) {
    lines.push("", `Catalog: [All reports](${catalogUrl})`);
  }

  return `${lines.join("\n")}\n`;
};

const requestJson = async ({ body, method = "GET", path: requestPath, token, repository }) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${requestPath}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${requestPath} failed with ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
};

const listIssueComments = async ({ issueNumber, repository, token }) => {
  const comments = [];
  let page = 1;

  while (true) {
    const pageComments = await requestJson({
      path: `/issues/${issueNumber}/comments?per_page=100&page=${page}`,
      repository,
      token,
    });
    comments.push(...pageComments);

    if (pageComments.length < 100) {
      return comments;
    }
    page += 1;
  }
};

const upsertPrStatusComment = async ({ body, prNumber, repository, token }) => {
  const comments = await listIssueComments({ issueNumber: prNumber, repository, token });
  const existingComment = comments.find((comment) =>
    typeof comment.body === "string" && comment.body.includes(COMMENT_MARKER)
  );

  if (existingComment) {
    await requestJson({
      body: { body },
      method: "PATCH",
      path: `/issues/comments/${existingComment.id}`,
      repository,
      token,
    });
    return { action: "updated", commentId: existingComment.id };
  }

  const createdComment = await requestJson({
    body: { body },
    method: "POST",
    path: `/issues/${prNumber}/comments`,
    repository,
    token,
  });
  return { action: "created", commentId: createdComment.id };
};

const main = async () => {
  const args = parseArgs(process.argv);
  const repository = args.repository || process.env.GITHUB_REPOSITORY || "";
  const token = args.token || process.env.GITHUB_TOKEN || "";
  const prNumber = normalizePrNumber(args["pr-number"] || process.env.PR_NUMBER);
  const headSha = normalizeSha(args["head-sha"] || process.env.COMMIT_SHA || process.env.GITHUB_SHA);

  if (!repository) {
    throw new Error("--repository or GITHUB_REPOSITORY is required");
  }
  if (!token) {
    throw new Error("--token or GITHUB_TOKEN is required");
  }
  if (!prNumber) {
    throw new Error("--pr-number or PR_NUMBER is required");
  }
  if (!headSha) {
    throw new Error("--head-sha, COMMIT_SHA, or GITHUB_SHA is required");
  }

  const reports = readReportsIndex(args["reports-index"]);
  const reportsByFamily = selectLatestReports(reports, prNumber, headSha);
  const body = renderComment({
    catalogUrl: args["catalog-url"] || "",
    headSha,
    prNumber,
    reportsByFamily,
    repository,
  });

  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), body);
  }

  const result = await upsertPrStatusComment({ body, prNumber, repository, token });
  console.log(`PR status comment ${result.action}: ${result.commentId}`);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  COMMENT_MARKER,
  REPORT_FAMILIES,
  renderComment,
  selectLatestReports,
};
