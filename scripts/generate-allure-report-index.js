#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  DEFAULT_PER_FAMILY_LIMIT,
  ensureDir,
  parseArgs,
  readJson,
} = require("./allure-pages-utils");

const readExistingReports = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  const parsed = readJson(filePath, []);
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
    .map((filePath) => readJson(path.resolve(filePath), null))
    .filter((payload) => payload && payload.path);
};

const main = () => {
  const args = parseArgs(process.argv);
  const current = readCurrentReports(args.current);
  const existing = readExistingReports(args.existing ? path.resolve(args.existing) : "");
  const outputDir = path.resolve(args.output || ".pages-index");
  const templatePath = path.resolve(args.template || ".github/pages/allure-reports-index.html");
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

  ensureDir(path.join(outputDir, "reports"));
  fs.writeFileSync(path.join(outputDir, "reports", "index.json"), `${JSON.stringify(reports, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outputDir, "reports", "retained-paths.txt"),
    `${reports.map((report) => report.path).join("\n")}\n`
  );
  fs.writeFileSync(
    path.join(outputDir, "reports", "retained-history-paths.txt"),
    `${reports.map((report) => report.historyPath).filter(Boolean).join("\n")}\n`
  );

  const template = fs.readFileSync(templatePath, "utf8");
  const html = template
    .replaceAll("__GENERATED_AT__", generatedAt)
    .replaceAll("__REPORT_LIMIT__", `${limitPerFamily}`);
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
