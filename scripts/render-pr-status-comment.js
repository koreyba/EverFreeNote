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

  let rawContents = fs.readFileSync(path.resolve(filePath), "utf8");
  if (rawContents.charCodeAt(0) === 0xfeff) {
    rawContents = rawContents.slice(1);
  }

  const payload = JSON.parse(rawContents);
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

const isSafeHttpUrl = (value) => {
  try {
    const url = new URL(`${value ?? ""}`);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const escapeMarkdownCell = (value) =>
  `${value ?? ""}`
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replaceAll("|", "\\|")
    .trim();

const buildMarkdownLink = (label, url) => {
  const safeLabel = escapeMarkdownCell(label);
  return isSafeHttpUrl(url) ? `[${safeLabel}](${url})` : safeLabel;
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
  return buildMarkdownLink("Open report", report.url);
};

const buildWorkflowCell = (repository, report) => {
  if (!report) {
    return "Waiting for publish";
  }

  const label = report.workflow || "Workflow run";
  const runUrl = buildRunUrl(repository, report);
  return runUrl ? buildMarkdownLink(label, runUrl) : escapeMarkdownCell(label);
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
    `Updated for PR #${escapeMarkdownCell(prNumber)} at \`${normalizeSha(headSha).slice(0, 7) || "unknown"}\` on ${formatDateTime(updatedAt)}.`,
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
    lines.push("", `Catalog: ${buildMarkdownLink("All reports", catalogUrl)}`);
  }

  return `${lines.join("\n")}\n`;
};

const main = () => {
  const args = parseArgs(process.argv);
  const repository = args.repository || process.env.GITHUB_REPOSITORY || "";
  const prNumber = normalizePrNumber(args["pr-number"] || process.env.PR_NUMBER);
  const headSha = normalizeSha(args["head-sha"] || process.env.COMMIT_SHA || process.env.GITHUB_SHA);

  if (!repository) {
    throw new Error("--repository or GITHUB_REPOSITORY is required");
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
    return;
  }

  process.stdout.write(body);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  COMMENT_MARKER,
  REPORT_FAMILIES,
  renderComment,
  selectLatestReports,
};
