#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const FAMILY_LABELS = {
  allure: "Allure Report",
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
const realpathSyncNative = fs.realpathSync.native || fs.realpathSync;

const isPathWithin = (basePath, candidatePath) => {
  const relativePath = path.relative(basePath, candidatePath);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};

const findExistingAncestor = (candidatePath) => {
  let currentPath = candidatePath;
  while (true) {
    try {
      fs.lstatSync(currentPath);
      return currentPath;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        throw new Error(`No existing ancestor found for path: ${candidatePath}`);
      }
      currentPath = parentPath;
    }
  }
};

const ensureWithinWorkspace = (targetPath, optionName) => {
  const workspaceRoot = path.resolve(process.cwd());
  const candidatePath = path.resolve(targetPath);
  if (!isPathWithin(workspaceRoot, candidatePath)) {
    throw new Error(`${optionName} must be inside repository workspace: ${targetPath}`);
  }

  const canonicalWorkspaceRoot = realpathSyncNative(workspaceRoot);
  const existingAncestor = findExistingAncestor(candidatePath);
  const canonicalAncestor = realpathSyncNative(existingAncestor);
  if (!isPathWithin(canonicalWorkspaceRoot, canonicalAncestor)) {
    throw new Error(`${optionName} resolves outside repository workspace: ${targetPath}`);
  }
  return candidatePath;
};

const ensureWithinDirectory = (targetPath, optionName, baseDir) => {
  const resolvedBase = path.resolve(baseDir);
  const candidatePath = path.resolve(targetPath);
  if (!isPathWithin(resolvedBase, candidatePath)) {
    throw new Error(`${optionName} must stay within ${resolvedBase}: ${targetPath}`);
  }

  const canonicalBase = realpathSyncNative(findExistingAncestor(resolvedBase));
  const existingAncestor = findExistingAncestor(candidatePath);
  const canonicalAncestor = realpathSyncNative(existingAncestor);
  if (!isPathWithin(canonicalBase, canonicalAncestor)) {
    throw new Error(`${optionName} resolves outside ${resolvedBase}: ${targetPath}`);
  }
  return candidatePath;
};

const ensureGithubOutputPath = (targetPath) => {
  if (!targetPath) return "";
  const configuredPath = process.env.GITHUB_OUTPUT;
  if (!configuredPath) {
    throw new Error("--github-output requires GITHUB_OUTPUT");
  }

  const candidatePath = path.resolve(targetPath);
  const expectedPath = path.resolve(configuredPath);
  if (candidatePath !== expectedPath) {
    throw new Error("--github-output must match GITHUB_OUTPUT");
  }
  return candidatePath;
};

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

const trimTrailingSlashes = (value) => {
  let endIndex = value.length;
  while (endIndex > 0 && value[endIndex - 1] === "/") {
    endIndex -= 1;
  }
  return value.slice(0, endIndex);
};

const trimBoundaryCharacter = (value, boundaryCharacter) => {
  let startIndex = 0;
  let endIndex = value.length;

  while (startIndex < endIndex && value[startIndex] === boundaryCharacter) {
    startIndex += 1;
  }

  while (endIndex > startIndex && value[endIndex - 1] === boundaryCharacter) {
    endIndex -= 1;
  }

  return value.slice(startIndex, endIndex);
};

const slugify = (value) =>
  {
    const normalizedValue = String(value || "").trim().toLowerCase();
    let slug = "";
    let previousWasDash = false;

    for (const character of normalizedValue) {
      const isAlphaNumeric =
        (character >= "a" && character <= "z") ||
        (character >= "0" && character <= "9");
      if (isAlphaNumeric) {
        slug += character;
        previousWasDash = false;
        continue;
      }

      if (!previousWasDash) {
        slug += "-";
        previousWasDash = true;
      }
    }

    return trimBoundaryCharacter(slug, "-") || "unknown";
  };

const ensureDir = (dirPath) => {
  const safeDirPath = ensureWithinWorkspace(dirPath, "directory");
  fs.mkdirSync(safeDirPath, { recursive: true });
};

const readJson = (filePath, fallback = null) => {
  const safeFilePath = ensureWithinWorkspace(filePath, "JSON input");
  try {
    return JSON.parse(fs.readFileSync(safeFilePath, "utf8"));
  } catch {
    return fallback;
  }
};

const listify = (value) => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const createGithubOutputDelimiter = (key, value) => {
  const safeKey = slugify(key).replaceAll("-", "_").toUpperCase();
  let counter = 0;
  let delimiter = "";
  do {
    delimiter = `EOF_${safeKey}_${counter}`;
    counter += 1;
  } while (value.includes(delimiter));
  return delimiter;
};

const appendGithubOutput = (githubOutputPath, values) => {
  if (!githubOutputPath) return;
  const safeGithubOutputPath = ensureGithubOutputPath(githubOutputPath);
  const lines = [];
  for (const [key, value] of Object.entries(values)) {
    const normalizedValue = `${value ?? ""}`;
    if (!normalizedValue.includes("\n")) {
      lines.push(`${key}=${normalizedValue}`);
      continue;
    }

    const delimiter = createGithubOutputDelimiter(key, normalizedValue);
    lines.push(`${key}<<${delimiter}`, normalizedValue, delimiter);
  }
  fs.appendFileSync(safeGithubOutputPath, `${lines.join("\n")}\n`);
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
    };
  }

  if (eventName === "workflow_dispatch") {
    return {
      scopeType: "manual",
      scopeKey: "manual",
      scopeLabel: "Manual",
    };
  }

  if (refName === "main" || refName === "develop") {
    return {
      scopeType: "branch",
      scopeKey: `branch-${slugify(refName)}`,
      scopeLabel: refName,
    };
  }

  return {
    scopeType: "manual",
    scopeKey: "manual",
    scopeLabel: "Manual",
  };
};

const computeReportContext = ({ family, env = process.env }) => {
  const runId = env.GITHUB_RUN_ID || "0";
  const runAttempt = env.GITHUB_RUN_ATTEMPT || "1";
  const prNumber = env.PR_NUMBER || "";
  const refName = env.REF_NAME || env.GITHUB_REF_NAME || "unknown";
  const eventName = env.GITHUB_EVENT_NAME || "";
  const pagesBaseUrl = trimTrailingSlashes(env.PAGES_BASE_URL || "");
  const scope = computeScope({ prNumber, refName, eventName });
  const reportDir = normalizeSlashes(
    path.join("reports", family, scope.scopeKey, `run-${runId}-attempt-${runAttempt}`)
  );
  const reportUrl = pagesBaseUrl ? `${pagesBaseUrl}/${reportDir}/` : "";
  const historyPath = normalizeSlashes(path.join("_history", family, "history.jsonl"));

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
  ensureGithubOutputPath,
  ensureWithinDirectory,
  ensureWithinWorkspace,
  getFamilyLabel,
  getSuiteMetadata,
  listify,
  normalizeSlashes,
  parseArgs,
  readJson,
  slugify,
};
