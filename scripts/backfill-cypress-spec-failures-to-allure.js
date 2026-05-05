#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { parseArgs, ensureDir } = require("./allure-pages-utils");

const ANSI_ESCAPE = String.fromCodePoint(27);
const ERROR_HINT_PATTERN = /(OOM|heap|out of memory|failed the current spec|renderer|crash|mark-compacts)/i;

const stripAnsiCodePrefix = (segment) => {
  if (!segment.startsWith("[")) {
    return segment;
  }

  let index = 1;
  while (index < segment.length && (segment[index] === ";" || /\d/.test(segment[index]))) {
    index += 1;
  }

  return segment[index] === "m" ? segment.slice(index + 1) : segment;
};

const stripAnsi = (value) =>
  value
    .split(ANSI_ESCAPE)
    .map((segment, index) => (index === 0 ? segment : stripAnsiCodePrefix(segment)))
    .join("");

const normalizeSpecPath = (value) => {
  const normalized = value.replaceAll("\\", "/");
  let firstNonSlashIndex = 0;
  while (normalized[firstNonSlashIndex] === "/") {
    firstNonSlashIndex += 1;
  }
  return normalized.slice(firstNonSlashIndex);
};

const isSpecToken = (value) => /\.cy\.(?:js|jsx|ts|tsx)$/.test(value);

const parseSummarySpecLine = (line) => {
  const tokens = line.trim().split(/\s+/);
  const specIndex = tokens.findIndex(isSpecToken);
  if (specIndex === -1 || tokens.length < specIndex + 7) {
    return null;
  }

  const [, total, passed, failed, pending, skipped] = tokens.slice(specIndex + 1, specIndex + 7);
  if (!/^\d+$/.test(total) || !/^\d+$/.test(passed) || !/^\d+$/.test(failed)) {
    return null;
  }

  return {
    spec: normalizeSpecPath(tokens[specIndex]),
    total,
    passed,
    failed,
    pending,
    skipped,
  };
};

const parseRunningSpecLine = (line) => {
  const markerIndex = line.indexOf("Running:");
  if (markerIndex === -1) {
    return "";
  }

  const candidate = line.slice(markerIndex + "Running:".length).trim().split(/\s+/)[0] || "";
  return isSpecToken(candidate) ? normalizeSpecPath(candidate) : "";
};

const readTextFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 2) {
    const bom16le = buffer[0] === 0xff && buffer[1] === 0xfe;
    const bom16be = buffer[0] === 0xfe && buffer[1] === 0xff;
    if (bom16le) {
      return buffer.slice(2).toString("utf16le");
    }
    if (bom16be) {
      const swapped = Buffer.from(buffer.slice(2));
      swapped.swap16();
      return swapped.toString("utf16le");
    }
  }

  const utf8 = buffer.toString("utf8");
  if (utf8.includes("\u0000")) {
    return buffer.toString("utf16le");
  }

  return utf8;
};

const collectExistingFailures = (resultsDir) => {
  const failedPackages = new Set();
  if (!fs.existsSync(resultsDir)) {
    return failedPackages;
  }

  for (const entry of fs.readdirSync(resultsDir)) {
    if (!entry.endsWith("-result.json")) {
      continue;
    }

    const filePath = path.join(resultsDir, entry);
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      console.warn(`Skipping malformed Allure result file ${filePath}: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (payload.status === "passed" || payload.status === "skipped") {
      continue;
    }

    const packageLabel = (payload.labels || []).find((label) => label.name === "package")?.value;
    if (packageLabel) {
      failedPackages.add(packageLabel);
    }
  }

  return failedPackages;
};

const extractFailingSpecs = (logLines) => {
  const foundSpecs = new Map();

  for (const line of logLines) {
    const summary = parseSummarySpecLine(line);
    if (!summary) {
      continue;
    }

    const failedCount = Number(summary.failed);
    const spec = summary.spec;
    if (!spec || failedCount <= 0) {
      continue;
    }

    if (!foundSpecs.has(spec)) {
      foundSpecs.set(spec, { spec, summaryLine: line.trim() });
    }
  }

  return [...foundSpecs.values()];
};

const collectSegment = (logLines, spec) => {
  let startIndex = logLines.findIndex((line) => parseRunningSpecLine(line) === spec);
  if (startIndex === -1) {
    startIndex = 0;
  }

  let endIndex = logLines.length;
  for (let index = startIndex + 1; index < logLines.length; index += 1) {
    if (parseRunningSpecLine(logLines[index])) {
      endIndex = index;
      break;
    }
  }

  return logLines.slice(startIndex, endIndex);
};

const buildMessage = (segmentLines, summaryLine) => {
  const messageLines = segmentLines.filter((line) => ERROR_HINT_PATTERN.test(line));
  const trimmedLines = messageLines.slice(0, 8);
  if (trimmedLines.length > 0) {
    return trimmedLines.join("\n");
  }

  return summaryLine || "Cypress failed this spec before Allure could persist a failing test result.";
};

const extractCounts = (summaryLine) => {
  const summary = parseSummarySpecLine(summaryLine);
  if (!summary) {
    return null;
  }

  const { total, passed, failed, pending, skipped } = summary;
  return { total, passed, failed, pending, skipped };
};

const writeSyntheticFailure = (resultsDir, spec, message, summaryLine) => {
  const normalizedSpec = normalizeSpecPath(spec);
  const packageName = `cypress.component.${normalizedSpec.replaceAll("/", ".")}`;
  const specFilePath = `cypress/component/${normalizedSpec}`;
  const summaryCounts = extractCounts(summaryLine);
  const now = Date.now();
  const outputPath = path.join(resultsDir, `${randomUUID()}-result.json`);

  const payload = {
    uuid: randomUUID(),
    name: `spec crash: ${normalizedSpec}`,
    fullName: `${specFilePath}#spec crash`,
    historyId: `${packageName}:spec-crash`,
    testCaseId: `${packageName}:spec-crash`,
    status: "broken",
    statusDetails: {
      message,
      trace: summaryLine || message,
    },
    stage: "finished",
    steps: [],
    attachments: [],
    parameters: [
      {
        name: "Synthetic",
        value: "Generated from Cypress component runner log because Allure adapter emitted no failing result.",
      },
      ...(summaryCounts
        ? [
            { name: "Spec tests", value: summaryCounts.total },
            { name: "Spec passed", value: summaryCounts.passed },
            { name: "Spec failed", value: summaryCounts.failed },
            { name: "Spec pending", value: summaryCounts.pending },
            { name: "Spec skipped", value: summaryCounts.skipped },
          ]
        : []),
    ],
    labels: [
      { name: "language", value: "javascript" },
      { name: "framework", value: "cypress" },
      { name: "parentSuite", value: "Component Spec Crash" },
      { name: "suite", value: normalizedSpec },
      { name: "package", value: packageName },
    ],
    links: [],
    start: now,
    stop: now,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return outputPath;
};

const main = () => {
  const args = parseArgs(process.argv);
  if (typeof args["results-dir"] !== "string" || args["results-dir"].trim() === "") {
    throw new Error("--results-dir is required");
  }

  if (typeof args["log-file"] !== "string" || args["log-file"].trim() === "") {
    throw new Error("--log-file is required");
  }

  const resultsDir = path.resolve(args["results-dir"]);
  const logFile = path.resolve(args["log-file"]);

  if (!fs.existsSync(logFile)) {
    console.log(`No Cypress log file found at ${logFile}; skipping Allure backfill.`);
    return;
  }

  ensureDir(resultsDir);

  const existingFailures = collectExistingFailures(resultsDir);
  const logLines = stripAnsi(readTextFile(logFile)).split(/\r?\n/);
  const failingSpecs = extractFailingSpecs(logLines);
  let created = 0;

  for (const failingSpec of failingSpecs) {
    const packageName = `cypress.component.${failingSpec.spec.replaceAll("/", ".")}`;
    if (existingFailures.has(packageName)) {
      continue;
    }

    const segment = collectSegment(logLines, failingSpec.spec);
    const message = buildMessage(segment, failingSpec.summaryLine);
    writeSyntheticFailure(resultsDir, failingSpec.spec, message, failingSpec.summaryLine);
    created += 1;
  }

  console.log(`Synthetic Allure failures created: ${created}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
