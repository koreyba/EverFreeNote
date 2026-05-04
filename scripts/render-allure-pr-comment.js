#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs, readJson } = require("./allure-pages-utils");

const COMMENT_MARKER = "<!-- allure-reports-comment -->";
const FAMILY_ORDER = ["unit", "component", "e2e"];
const FAMILY_LABELS = {
  component: "Component",
  e2e: "E2E",
  unit: "Unit",
};

const normalizePrNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return `${value}`.trim();
};

const normalizeSha = (value) => `${value || ""}`.trim().toLowerCase();

const formatDateTime = (value) => {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) {
    return "unknown";
  }
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
};

const formatConclusion = (value) => {
  switch (`${value || ""}`.toLowerCase()) {
    case "success":
      return "Passed";
    case "failure":
      return "Failed";
    case "timed_out":
      return "Timed out";
    case "cancelled":
      return "Cancelled";
    case "skipped":
      return "Skipped";
    case "action_required":
      return "Action required";
    case "neutral":
      return "Completed";
    default:
      return "Completed";
  }
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
  const payload = readJson(path.resolve(filePath), []);
  return Array.isArray(payload) ? payload : [];
};

const readWorkflowRuns = (filePath) => {
  const payload = readJson(path.resolve(filePath), []);
  return Array.isArray(payload) ? payload : [];
};

const selectLatestReports = (reports, prNumber, headSha) => {
  const normalizedPrNumber = normalizePrNumber(prNumber);
  const normalizedHeadSha = normalizeSha(headSha);
  const reportsByFamily = new Map();

  for (const family of FAMILY_ORDER) {
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

const buildReportCell = (report) => {
  if (!report?.url) {
    return "Not published";
  }
  return `[Open report](${report.url})`;
};

const buildWorkflowCell = (workflowRun) => {
  const label = formatConclusion(workflowRun?.conclusion);
  if (!workflowRun?.html_url) {
    return label;
  }
  return `[${label}](${workflowRun.html_url})`;
};

const renderComment = ({
  catalogUrl,
  headSha,
  prNumber,
  reportsByFamily,
  workflowRuns,
  updatedAt = new Date().toISOString(),
}) => {
  const runMap = new Map(
    workflowRuns.map((workflowRun) => [workflowRun.family, workflowRun])
  );

  const lines = [
    COMMENT_MARKER,
    "## PR Status",
    "",
    "### Allure Reports",
    "",
    `Updated for PR #${prNumber} at \`${normalizeSha(headSha).slice(0, 7) || "unknown"}\` on ${formatDateTime(updatedAt)}.`,
    "",
    "| Family | Workflow | Report |",
    "|---|---|---|",
  ];

  for (const family of FAMILY_ORDER) {
    const workflowRun = runMap.get(family) || null;
    const report = reportsByFamily.get(family) || null;
    lines.push(
      `| ${FAMILY_LABELS[family] || family} | ${buildWorkflowCell(workflowRun)} | ${buildReportCell(report)} |`
    );
  }

  if (catalogUrl) {
    lines.push("", `Catalog: [All reports](${catalogUrl})`);
  }

  return `${lines.join("\n")}\n`;
};

const main = () => {
  const args = parseArgs(process.argv);
  const reportsIndex = readReportsIndex(args["reports-index"]);
  const workflowRuns = readWorkflowRuns(args["workflow-runs-file"]);
  const reportsByFamily = selectLatestReports(reportsIndex, args["pr-number"], args["head-sha"]);
  const body = renderComment({
    catalogUrl: args["catalog-url"] || "",
    headSha: args["head-sha"],
    prNumber: args["pr-number"],
    reportsByFamily,
    workflowRuns,
    updatedAt: args["updated-at"],
  });

  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), body);
  } else {
    process.stdout.write(body);
  }
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
  FAMILY_ORDER,
  formatConclusion,
  renderComment,
  selectLatestReports,
};
