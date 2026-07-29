#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_PER_FAMILY_LIMIT,
  ensureDir,
  ensureWithinWorkspace,
  parseArgs,
  readJson,
} = require("./allure-pages-utils");

const readExistingReports = (filePath) => {
  if (!filePath) {
    return [];
  }
  const safeFilePath = ensureWithinWorkspace(filePath, "--existing");
  if (!fs.existsSync(safeFilePath)) {
    return [];
  }
  const parsed = readJson(safeFilePath, []);
  return Array.isArray(parsed) ? parsed : [];
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value || `${DEFAULT_PER_FAMILY_LIMIT}`, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PER_FAMILY_LIMIT;
  }
  return parsed;
};

const readCurrentReports = (currentArgs) => {
  const files = Array.isArray(currentArgs) ? currentArgs : [currentArgs];
  return files
    .filter(Boolean)
    .map((filePath) => readJson(filePath, null))
    .filter((payload) => payload?.path);
};

const main = () => {
  const args = parseArgs(process.argv);
  const current = readCurrentReports(args.current);
  const existing = readExistingReports(
    args.existing ? ensureWithinWorkspace(args.existing, "--existing") : ""
  );
  const outputDir = ensureWithinWorkspace(args.output || ".pages-index", "--output");
  const templatePath = ensureWithinWorkspace(
    args.template || ".github/pages/allure-reports-index.html",
    "--template"
  );
  const limitPerFamily = parseLimit(args["limit-per-family"]);
  const generatedAt = new Date().toISOString();

  const reportsByPath = new Map();
  for (const report of [...existing, ...current]) {
    if (report && typeof report.path === "string") {
      reportsByPath.set(report.path, report);
    }
  }

  const familyBuckets = new Map();
  for (const report of reportsByPath.values()) {
    const family = report.family || "unknown";
    if (!familyBuckets.has(family)) {
      familyBuckets.set(family, []);
    }
    familyBuckets.get(family).push(report);
  }

  const reports = [];
  for (const bucket of familyBuckets.values()) {
    const limited = bucket
      .sort((left, right) => {
        const leftDate = Date.parse(left.generatedAt || "") || 0;
        const rightDate = Date.parse(right.generatedAt || "") || 0;
        return rightDate - leftDate;
      })
      .slice(0, limitPerFamily);
    reports.push(...limited);
  }

  reports.sort((left, right) => {
    const leftDate = Date.parse(left.generatedAt || "") || 0;
    const rightDate = Date.parse(right.generatedAt || "") || 0;
    return rightDate - leftDate;
  });

  const reportsDir = ensureWithinWorkspace(path.join(outputDir, "reports"), "--output");
  const reportsIndexPath = ensureWithinWorkspace(
    path.join(reportsDir, "index.json"),
    "--output"
  );
  const retainedPathsPath = ensureWithinWorkspace(
    path.join(reportsDir, "retained-paths.txt"),
    "--output"
  );
  const retainedHistoryPathsPath = ensureWithinWorkspace(
    path.join(reportsDir, "retained-history-paths.txt"),
    "--output"
  );
  const indexPath = ensureWithinWorkspace(path.join(outputDir, "index.html"), "--output");

  ensureDir(reportsDir);
  fs.writeFileSync(reportsIndexPath, `${JSON.stringify(reports, null, 2)}\n`);
  fs.writeFileSync(
    retainedPathsPath,
    `${reports.map((report) => report.path).join("\n")}\n`
  );
  fs.writeFileSync(
    retainedHistoryPathsPath,
    `${reports.map((report) => report.historyPath).filter(Boolean).join("\n")}\n`
  );

  const template = fs.readFileSync(templatePath, "utf8");
  const html = template
    .replaceAll("__GENERATED_AT__", generatedAt)
    .replaceAll("__REPORT_LIMIT__", `${limitPerFamily}`);
  fs.writeFileSync(indexPath, html);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
