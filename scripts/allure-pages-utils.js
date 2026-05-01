#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const FAMILY_LABELS = {
  component: "Component",
  e2e: "E2E",
  unit: "Unit",
};

const SUITE_METADATA = {
  component: {
    suite: "component",
    surface: "web",
    layer: "component",
    workflow: "component-tests",
    label: "Web Component",
  },
  "core-unit": {
    suite: "core-unit",
    surface: "core",
    layer: "unit",
    workflow: "unit-tests",
    label: "Core Unit",
  },
  "core-integration": {
    suite: "core-integration",
    surface: "core",
    layer: "integration",
    workflow: "unit-tests",
    label: "Core Integration",
  },
  "web-unit": {
    suite: "web-unit",
    surface: "web",
    layer: "unit",
    workflow: "unit-tests",
    label: "Web Unit",
  },
  "mobile-unit": {
    suite: "mobile-unit",
    surface: "mobile",
    layer: "unit",
    workflow: "unit-tests",
    label: "Mobile Unit",
  },
  e2e: {
    suite: "e2e",
    surface: "web",
    layer: "e2e",
    workflow: "e2e-tests",
    label: "Web E2E",
  },
};

const DEFAULT_PER_FAMILY_LIMIT = 20;

const parseArgs = (argv) => {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      throw new Error(`Unexpected argument: ${key}`);
    }

    const normalizedKey = key.slice(2);
    const next = argv[index + 1];

    if (next === undefined || next.startsWith("--")) {
      if (!args[normalizedKey]) {
        args[normalizedKey] = true;
      } else if (Array.isArray(args[normalizedKey])) {
        args[normalizedKey].push(true);
      } else {
        args[normalizedKey] = [args[normalizedKey], true];
      }
      continue;
    }

    if (!args[normalizedKey]) {
      args[normalizedKey] = next;
    } else if (Array.isArray(args[normalizedKey])) {
      args[normalizedKey].push(next);
    } else {
      args[normalizedKey] = [args[normalizedKey], next];
    }

    index += 1;
  }
  return args;
};

const normalizeSlashes = (value) => value.replaceAll(path.sep, "/");

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const readJson = (filePath, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const listify = (value) => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const appendGithubOutput = (githubOutputPath, values) => {
  if (!githubOutputPath) return;
  const lines = Object.entries(values).flatMap(([key, value]) => {
    const normalizedValue = `${value ?? ""}`;
    if (!normalizedValue.includes("\n")) {
      return `${key}=${normalizedValue}`;
    }

    const delimiter = `EOF_${key.toUpperCase()}_${Math.random().toString(16).slice(2)}`;
    return [
      `${key}<<${delimiter}`,
      normalizedValue,
      delimiter,
    ];
  });
  fs.appendFileSync(githubOutputPath, `${lines.join("\n")}\n`);
};

const getFamilyLabel = (family) => FAMILY_LABELS[family] || family;

const getSuiteMetadata = (suite) => {
  const metadata = SUITE_METADATA[suite];
  if (!metadata) {
    throw new Error(`Unknown suite metadata for '${suite}'`);
  }
  return metadata;
};

const computeScope = ({
  prNumber,
  refName,
  eventName,
}) => {
  if (prNumber) {
    return {
      scopeType: "pr",
      scopeKey: `pr-${prNumber}`,
      scopeLabel: `PR #${prNumber}`,
      historyKey: `pr-${prNumber}`,
    };
  }

  if (eventName === "workflow_dispatch") {
    return {
      scopeType: "manual",
      scopeKey: "manual",
      scopeLabel: "Manual",
      historyKey: null,
    };
  }

  if (refName === "main" || refName === "develop") {
    return {
      scopeType: "branch",
      scopeKey: `branch-${slugify(refName)}`,
      scopeLabel: refName,
      historyKey: `branch-${slugify(refName)}`,
    };
  }

  return {
    scopeType: "manual",
    scopeKey: "manual",
    scopeLabel: "Manual",
    historyKey: null,
  };
};

const computeReportContext = ({ family, env = process.env }) => {
  const runId = env.GITHUB_RUN_ID || "0";
  const runAttempt = env.GITHUB_RUN_ATTEMPT || "1";
  const prNumber = env.PR_NUMBER || "";
  const refName = env.REF_NAME || env.GITHUB_REF_NAME || "unknown";
  const eventName = env.GITHUB_EVENT_NAME || "";
  const pagesBaseUrl = (env.PAGES_BASE_URL || "").replace(/\/+$/, "");
  const scope = computeScope({ prNumber, refName, eventName });
  const reportDir = normalizeSlashes(
    path.join("reports", family, scope.scopeKey, `run-${runId}-attempt-${runAttempt}`)
  );
  const reportUrl = pagesBaseUrl ? `${pagesBaseUrl}/${reportDir}/` : "";
  const historyPath = scope.historyKey
    ? normalizeSlashes(path.join("_history", family, `${scope.historyKey}.json`))
    : "";

  return {
    family,
    familyLabel: getFamilyLabel(family),
    runId,
    runAttempt,
    prNumber: prNumber || null,
    refName,
    eventName,
    scopeType: scope.scopeType,
    scopeKey: scope.scopeKey,
    scopeLabel: scope.scopeLabel,
    reportDir,
    reportUrl,
    historyPath,
    pagesBaseUrl,
    sha: env.COMMIT_SHA || env.GITHUB_SHA || "unknown",
    previewUrl: env.PREVIEW_URL || env.BASE_URL || "",
    e2eRef: env.E2E_REF || "",
    workflow: env.WORKFLOW_NAME || env.GITHUB_WORKFLOW || "",
    outcome: env.FAMILY_OUTCOME || "unknown",
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  DEFAULT_PER_FAMILY_LIMIT,
  appendGithubOutput,
  computeReportContext,
  ensureDir,
  getFamilyLabel,
  getSuiteMetadata,
  listify,
  normalizeSlashes,
  parseArgs,
  readJson,
  slugify,
};
