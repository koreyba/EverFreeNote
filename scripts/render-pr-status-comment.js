#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { ensureWithinWorkspace, parseArgs } = require("./allure-pages-utils");

const COMMENT_MARKER = "<!-- everfreenote-pr-status-comment -->";
const STATUS_STATE_MARKER_PREFIX = "<!-- everfreenote-pr-status-state:";
const STATUS_STATE_MARKER_SUFFIX = " -->";
const STATUS_STATE_MARKER_PATTERN =
  /<!-- everfreenote-pr-status-state:(\{.*?}) -->/s;
const WORKFLOW_NAMES = [
  "Unit Tests",
  "Component Tests",
  "E2E Tests (PR Preview)",
];
const WORKFLOW_STATUS_KEYS = {
  "Unit Tests": "unit",
  "Component Tests": "component",
  "E2E Tests (PR Preview)": "e2e",
};
const DEFAULT_STATUS_STATE = {
  headSha: "",
  statuses: {
    unit: "waiting",
    component: "waiting",
    e2e: "waiting",
  },
  runs: {},
  reports: {},
  allureUrl: "",
};

const assertCanonicalWorkspacePath = (candidatePath, optionName) => {
  const workspaceRoot = fs.realpathSync.native(process.cwd());
  if (
    candidatePath !== workspaceRoot &&
    !candidatePath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new Error(`${optionName} resolves outside repository workspace: ${candidatePath}`);
  }
  return candidatePath;
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
  if (!filePath) {
    return [];
  }

  const safeFilePath = ensureWithinWorkspace(filePath, "--reports-index");
  assertCanonicalWorkspacePath(safeFilePath, "--reports-index");
  if (!fs.existsSync(safeFilePath)) {
    return [];
  }
  let rawContents = fs.readFileSync(safeFilePath, "utf8");
  if (rawContents.charCodeAt(0) === 0xfeff) {
    rawContents = rawContents.slice(1);
  }

  const payload = JSON.parse(rawContents);
  return Array.isArray(payload) ? payload : [];
};

const selectLatestReports = (reports, prNumber, headSha) => {
  const normalizedPrNumber = normalizePrNumber(prNumber);
  const normalizedHeadSha = normalizeSha(headSha);

  const relevantReports = reports.filter((report) =>
    report?.family === "allure" &&
    normalizePrNumber(report?.prNumber) === normalizedPrNumber &&
    normalizeSha(report?.sha) === normalizedHeadSha
  );

  const latestReport = [...relevantReports].sort(compareReports)[0] || null;

  const reportsByWorkflow = new Map();
  for (const workflowName of WORKFLOW_NAMES) {
    const match = relevantReports
      .filter((report) => report?.workflow === workflowName)
      .sort(compareReports)[0];
    reportsByWorkflow.set(workflowName, match || null);
  }

  return {
    latestReport,
    reportsByWorkflow,
  };
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

const normalizeStatus = (value) => {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  return ["waiting", "success", "failure", "cancelled", "skipped"].includes(normalized)
    ? normalized
    : "waiting";
};

const cloneDefaultStatusState = () => ({
  headSha: DEFAULT_STATUS_STATE.headSha,
  statuses: { ...DEFAULT_STATUS_STATE.statuses },
  runs: {},
  reports: {},
  allureUrl: DEFAULT_STATUS_STATE.allureUrl,
});

const readStatusState = (body) => {
  const state = cloneDefaultStatusState();
  const marker = STATUS_STATE_MARKER_PATTERN.exec(`${body ?? ""}`);

  if (!marker) {
    return state;
  }

  try {
    const parsed = JSON.parse(marker[1]);
    state.headSha = normalizeSha(parsed.headSha);
    state.statuses = {
      ...state.statuses,
      ...parsed.statuses,
    };
    for (const key of Object.keys(state.statuses)) {
      state.statuses[key] = normalizeStatus(state.statuses[key]);
    }
    state.runs = {};
    if (parsed.runs && typeof parsed.runs === "object") {
      for (const [key, value] of Object.entries(parsed.runs)) {
        const runId = `${value?.runId ?? ""}`.trim();
        if (/^\d+$/.test(runId)) {
          state.runs[key] = { runId };
        }
      }
    }
    state.reports = parsed.reports && typeof parsed.reports === "object"
      ? parsed.reports
      : {};
    state.allureUrl = isSafeHttpUrl(parsed.allureUrl) ? parsed.allureUrl : "";
  } catch {
    return cloneDefaultStatusState();
  }

  return state;
};

const buildReportState = (report) => {
  if (!report?.url || !isSafeHttpUrl(report.url)) {
    return null;
  }

  return {
    url: report.url,
    runId: report.runId || "",
    runAttempt: report.runAttempt || "",
  };
};

const buildStateMarker = (state) =>
  `${STATUS_STATE_MARKER_PREFIX}${JSON.stringify(state)}${STATUS_STATE_MARKER_SUFFIX}`;

const buildStatusCell = (status) => {
  switch (normalizeStatus(status)) {
    case "success":
      return "✅ Completed";
    case "failure":
      return "❌ Failed";
    case "cancelled":
      return "⏹ Cancelled";
    case "skipped":
      return "⚪ Skipped";
    default:
      return "*Waiting for run...*";
  }
};

const createRenderState = ({ latestReport, reportsByWorkflow, statusState }) => {
  const nextState = {
    ...cloneDefaultStatusState(),
    ...statusState,
    statuses: {
      ...DEFAULT_STATUS_STATE.statuses,
      ...statusState.statuses,
    },
    runs: {
      ...statusState.runs,
    },
    reports: {
      ...statusState.reports,
    },
  };

  for (const workflowName of WORKFLOW_NAMES) {
    const statusKey = WORKFLOW_STATUS_KEYS[workflowName];
    const reportState = buildReportState(
      reportsByWorkflow.get(workflowName),
    );
    if (reportState) {
      nextState.reports[statusKey] = reportState;
    }
    nextState.statuses[statusKey] = normalizeStatus(
      nextState.statuses[statusKey],
    );
  }

  if (latestReport?.url && isSafeHttpUrl(latestReport.url)) {
    nextState.allureUrl = latestReport.url;
  }
  return nextState;
};

const resolveLatestReport = (latestReport, nextState) => {
  if (latestReport?.url && isSafeHttpUrl(latestReport.url)) {
    return latestReport;
  }
  if (nextState.allureUrl) {
    return { url: nextState.allureUrl };
  }
  return null;
};

const buildWorkflowStatusCell = ({
  nextState,
  report,
  repository,
  statusKey,
}) => {
  const statusCell = buildStatusCell(nextState.statuses[statusKey]);
  const run = report || nextState.runs[statusKey];
  if (!run) {
    return statusCell;
  }

  const runUrl = buildRunUrl(repository, run);
  return runUrl
    ? `[${escapeMarkdownCell(statusCell)}](${runUrl})`
    : statusCell;
};

const buildWorkflowRow = ({
  nextState,
  reportsByWorkflow,
  repository,
  suitesByWorkflow,
  workflowName,
}) => {
  const statusKey = WORKFLOW_STATUS_KEYS[workflowName];
  const report =
    reportsByWorkflow.get(workflowName) ||
    nextState.reports[statusKey] ||
    null;
  const statusCell = buildWorkflowStatusCell({
    nextState,
    report,
    repository,
    statusKey,
  });
  const suitesCell = suitesByWorkflow[workflowName] || "-";

  return `| ${escapeMarkdownCell(workflowName)} | ${statusCell} | ${escapeMarkdownCell(suitesCell)} |`;
};

const renderComment = ({
  catalogUrl,
  headSha,
  prNumber,
  latestReport,
  reportsByWorkflow,
  repository,
  statusState = cloneDefaultStatusState(),
  updatedAt = new Date().toISOString(),
}) => {
  const nextState = createRenderState({
    latestReport,
    reportsByWorkflow,
    statusState,
  });
  const effectiveLatestReport = resolveLatestReport(latestReport, nextState);

  const lines = [
    COMMENT_MARKER,
    buildStateMarker(nextState),
    "## PR Status",
    "",
    `Updated for PR #${escapeMarkdownCell(prNumber)} at \`${normalizeSha(headSha).slice(0, 7) || "unknown"}\` on ${formatDateTime(updatedAt)}.`,
    "",
  ];

  if (effectiveLatestReport?.url) {
    lines.push(
      "### 📊 Allure Test Report",
      buildMarkdownLink("Open Allure Report", effectiveLatestReport.url),
      ""
    );
  } else {
    lines.push(
      "### 📊 Allure Test Report",
      "No reports published yet.",
      ""
    );
  }

  lines.push(
    "### Contributing Workflows",
    "",
    "| Workflow | Status | Suites |",
    "|---|---|---|",
  );

  const WORKFLOW_SUITES = {
    "Unit Tests": "Core Unit, Core Integration, Web Unit, Mobile Unit",
    "Component Tests": "Web Component",
    "E2E Tests (PR Preview)": "Web E2E",
  };

  lines.push(
    ...WORKFLOW_NAMES.map((workflowName) =>
      buildWorkflowRow({
        nextState,
        reportsByWorkflow,
        repository,
        suitesByWorkflow: WORKFLOW_SUITES,
        workflowName,
      }),
    ),
  );

  if (catalogUrl) {
    lines.push("", `Catalog: ${buildMarkdownLink("All reports", catalogUrl)}`);
  }

  lines.push(
    "",
    "### 🤖 Android Build Panel",
    "Check a box below to trigger a release build:",
    "- [ ] 🚀 Build Stage Release APK",
    "- [ ] 🚀 Build Prod Release APK"
  );

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
  const { latestReport, reportsByWorkflow } = selectLatestReports(reports, prNumber, headSha);
  const statusState = cloneDefaultStatusState();
  statusState.headSha = headSha;
  const body = renderComment({
    catalogUrl: args["catalog-url"] || "",
    headSha,
    prNumber,
    latestReport,
    reportsByWorkflow,
    repository,
    statusState,
  });

  if (args.output) {
    const outputPath = ensureWithinWorkspace(args.output, "--output");
    assertCanonicalWorkspacePath(outputPath, "--output");
    fs.writeFileSync(outputPath, body);
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
  DEFAULT_STATUS_STATE,
  STATUS_STATE_MARKER_PREFIX,
  WORKFLOW_NAMES,
  buildReportState,
  cloneDefaultStatusState,
  readReportsIndex,
  readStatusState,
  renderComment,
  selectLatestReports,
};
