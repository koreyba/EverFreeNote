#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { XMLParser } = require("fast-xml-parser");
const { parseArgs, ensureDir } = require("./allure-pages-utils");

const ANSI_ESCAPE = String.fromCodePoint(27);
const COMPONENT_PATH_PREFIX = "cypress/component/";
const COMPONENT_PACKAGE_MARKER = "cypress.component.";
const SPEC_PATTERN = /\.cy\.(?:js|jsx|ts|tsx)$/;
const SPEC_IN_FULL_NAME_PATTERN =
  /(?:^|:)cypress\/component\/(.+?\.cy\.(?:js|jsx|ts|tsx))(?:#|$)/;
const ERROR_HINT_PATTERN =
  /(OOM|heap|out of memory|failed|failure|renderer|crash|exception|fatal|error)/i;
const MAX_TRACE_LINES = 500;
const SYNTHETIC_REASON =
  "Generated because Cypress reported a component failure that had no failing Allure result.";

const junitParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  isArray: (tagName, _jPath, _isLeafNode, isAttribute) =>
    !isAttribute &&
    ["testsuite", "testcase", "failure", "error", "skipped"].includes(tagName),
  processEntities: {
    enabled: true,
    maxEntityCount: 100,
    maxExpandedLength: 100_000,
  },
});

const stripAnsiCodePrefix = (segment) => {
  if (!segment.startsWith("[")) {
    return segment;
  }

  let index = 1;
  while (
    index < segment.length &&
    (segment[index] === ";" || /\d/.test(segment[index]))
  ) {
    index += 1;
  }

  return segment[index] === "m" ? segment.slice(index + 1) : segment;
};

const stripAnsi = (value) =>
  value
    .split(ANSI_ESCAPE)
    .map((segment, index) =>
      index === 0 ? segment : stripAnsiCodePrefix(segment),
    )
    .join("");

const normalizeSpecPath = (value = "") => {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  const componentIndex = normalized.indexOf(COMPONENT_PATH_PREFIX);
  if (componentIndex !== -1) {
    return normalized.slice(componentIndex + COMPONENT_PATH_PREFIX.length);
  }

  return normalized.replace(/^\/+/, "");
};

const isSpecPath = (value) => SPEC_PATTERN.test(value);

const normalizeSummaryCount = (value) => {
  if (value === "-") {
    return "0";
  }

  return /^\d+$/.test(value) ? value : null;
};

const parseSummarySpecLine = (line) => {
  const tokens = line.trim().split(/\s+/);
  const specIndex = tokens.findIndex(isSpecPath);
  if (specIndex === -1 || tokens.length < specIndex + 7) {
    return null;
  }

  const [, ...countTokens] = tokens.slice(specIndex + 1, specIndex + 7);
  const [total, passed, failed, pending, skipped] =
    countTokens.map(normalizeSummaryCount);
  if ([total, passed, failed, pending, skipped].includes(null)) {
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

  const afterMarker = line.slice(markerIndex + "Running:".length).trim();
  const match = afterMarker.match(
    /^(.+?\.cy\.(?:js|jsx|ts|tsx))(?:\s+\(\d+\s+of\s+\d+\))?(?:\s|$)/,
  );
  return match ? normalizeSpecPath(match[1]) : "";
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
  return utf8.includes("\u0000") ? buffer.toString("utf16le") : utf8;
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined || value === null ? [] : [value];
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isPathWithin = (rootPath, candidatePath) => {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};

const findExistingAncestor = (candidatePath) => {
  let currentPath = candidatePath;
  while (!fs.existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`No existing ancestor found for path: ${candidatePath}`);
    }
    currentPath = parentPath;
  }
  return currentPath;
};

const resolveWorkspacePath = (value, argumentName, required = false) => {
  const hasValue = typeof value === "string" && value.trim() !== "";
  if (!hasValue) {
    if (required) {
      throw new Error(`--${argumentName} is required`);
    }
    return "";
  }

  const workspaceRoot = path.resolve(process.cwd());
  const candidatePath = path.resolve(workspaceRoot, value.trim());
  if (!isPathWithin(workspaceRoot, candidatePath)) {
    throw new Error(`--${argumentName} must stay within the workspace`);
  }

  const canonicalWorkspaceRoot = fs.realpathSync.native(workspaceRoot);
  const existingAncestor = findExistingAncestor(candidatePath);
  const canonicalAncestor = fs.realpathSync.native(existingAncestor);
  if (!isPathWithin(canonicalWorkspaceRoot, canonicalAncestor)) {
    throw new Error(`--${argumentName} resolves outside the workspace`);
  }
  return candidatePath;
};

const collectFilesByExtension = (rootDir, extension) => {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const pendingDirectories = [rootDir];
  while (pendingDirectories.length > 0) {
    const currentDir = pendingDirectories.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(entryPath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
};

const collectSuites = (suites) => {
  const collected = [];
  const pending = [...toArray(suites)];
  while (pending.length > 0) {
    const suite = pending.shift();
    if (!suite || typeof suite !== "object") {
      continue;
    }
    collected.push(suite);
    pending.push(...toArray(suite.testsuite));
  }
  return collected;
};

const firstText = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object" && typeof value["#text"] === "string") {
    return value["#text"].trim();
  }
  return "";
};

const normalizeFailureMessage = (failure) => {
  const attributeMessage =
    failure && typeof failure === "object"
      ? String(failure["@_message"] || "").trim()
      : "";
  return (
    attributeMessage ||
    firstText(failure) ||
    "No failure message captured"
  );
};

const createFailureDetails = ({ testcase, suite, spec, failure }) => ({
  suite:
    String(testcase["@_classname"] || "").trim() ||
    String(suite["@_name"] || "").trim() ||
    "unknown-suite",
  name: String(testcase["@_name"] || "").trim() || "unknown component test",
  file: `${COMPONENT_PATH_PREFIX}${spec}`,
  message: normalizeFailureMessage(failure),
});

const collectSuiteFailures = (suite, spec) => {
  const failures = [];
  for (const testcase of toArray(suite.testcase)) {
    if (!testcase || typeof testcase !== "object") {
      continue;
    }

    const failureNodes = [
      ...toArray(testcase.failure),
      ...toArray(testcase.error),
    ];
    for (const failure of failureNodes) {
      failures.push(createFailureDetails({ testcase, suite, spec, failure }));
    }
  }
  return failures;
};

const parseJunitFile = (filePath) => {
  const parsed = junitParser.parse(readTextFile(filePath));
  const root = parsed?.testsuites;
  if (!root || typeof root !== "object") {
    throw new Error("missing <testsuites> root");
  }

  const suites = collectSuites(root.testsuite);
  const fileSuite = suites.find(
    (suite) =>
      typeof suite["@_file"] === "string" &&
      isSpecPath(normalizeSpecPath(suite["@_file"])),
  );
  if (!fileSuite) {
    throw new Error("missing component spec file attribute");
  }

  const spec = normalizeSpecPath(fileSuite["@_file"]);
  return {
    spec,
    sourceFile: filePath,
    modifiedAtMs: fs.statSync(filePath).mtimeMs,
    total: toNumber(root["@_tests"]),
    failed: toNumber(root["@_failures"]) + toNumber(root["@_errors"]),
    skipped: toNumber(root["@_skipped"]) + toNumber(root["@_disabled"]),
    durationSec: toNumber(root["@_time"]),
    failures: suites.flatMap((suite) => collectSuiteFailures(suite, spec)),
  };
};

const collectJunitResults = (junitDir) => {
  const resultsBySpec = new Map();
  const warnings = [];

  for (const filePath of collectFilesByExtension(junitDir, ".xml")) {
    try {
      const result = parseJunitFile(filePath);
      const previousResult = resultsBySpec.get(result.spec);
      const isNewer =
        !previousResult ||
        result.modifiedAtMs > previousResult.modifiedAtMs ||
        (result.modifiedAtMs === previousResult.modifiedAtMs &&
          result.sourceFile.localeCompare(previousResult.sourceFile) > 0);
      if (isNewer) {
        resultsBySpec.set(result.spec, result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Skipping malformed JUnit file ${filePath}: ${message}`);
    }
  }

  const results = [...resultsBySpec.values()].sort((left, right) =>
    left.spec.localeCompare(right.spec),
  );
  return { results, warnings };
};

const extractSpecFromFullName = (fullName) => {
  if (typeof fullName !== "string") {
    return "";
  }
  const match = SPEC_IN_FULL_NAME_PATTERN.exec(fullName);
  return match ? normalizeSpecPath(match[1]) : "";
};

const getPackageParts = (packageLabel) => {
  if (typeof packageLabel !== "string") {
    return { prefix: "", suffix: "" };
  }

  const markerIndex = packageLabel.indexOf(COMPONENT_PACKAGE_MARKER);
  if (markerIndex === -1) {
    return { prefix: "", suffix: "" };
  }

  return {
    prefix: packageLabel.slice(0, markerIndex),
    suffix: packageLabel.slice(
      markerIndex + COMPONENT_PACKAGE_MARKER.length,
    ),
  };
};

const getFullNamePrefix = (fullName) => {
  if (typeof fullName !== "string") {
    return "";
  }
  const markerIndex = fullName.indexOf(COMPONENT_PATH_PREFIX);
  return markerIndex === -1 ? "" : fullName.slice(0, markerIndex);
};

const readAllurePayload = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipping malformed Allure result file ${filePath}: ${message}`);
    return null;
  }
};

const collectAllureState = (resultsDir) => {
  const state = {
    failedSpecs: new Set(),
    failedPackageSuffixes: new Set(),
    hasFailure: false,
    packagePrefix: "everfreenote.",
    fullNamePrefix: "everfreenote:",
  };

  for (const entry of fs.readdirSync(resultsDir)) {
    if (!entry.endsWith("-result.json")) {
      continue;
    }

    const filePath = path.join(resultsDir, entry);
    const payload = readAllurePayload(filePath);
    if (!payload) {
      continue;
    }

    const packageLabel = (payload.labels || []).find(
      (label) => label.name === "package",
    )?.value;
    const packageParts = getPackageParts(packageLabel);
    if (packageParts.prefix) {
      state.packagePrefix = packageParts.prefix;
    }

    const detectedFullNamePrefix = getFullNamePrefix(payload.fullName);
    if (detectedFullNamePrefix) {
      state.fullNamePrefix = detectedFullNamePrefix;
    }

    if (payload.status !== "failed" && payload.status !== "broken") {
      continue;
    }

    state.hasFailure = true;
    const spec = extractSpecFromFullName(payload.fullName);
    if (spec) {
      state.failedSpecs.add(spec);
    }
    if (packageParts.suffix) {
      state.failedPackageSuffixes.add(packageParts.suffix);
    }
  }

  return state;
};

const hasAllureFailureForSpec = (allureState, spec) =>
  allureState.failedSpecs.has(spec) ||
  allureState.failedPackageSuffixes.has(spec.replaceAll("/", "."));

const extractFailingSpecsFromSummary = (logLines) => {
  const foundSpecs = new Map();
  for (const line of logLines) {
    const summary = parseSummarySpecLine(line);
    if (
      summary &&
      Number(summary.failed) > 0 &&
      !foundSpecs.has(summary.spec)
    ) {
      foundSpecs.set(summary.spec, {
        spec: summary.spec,
        counts: summary,
        summaryLine: line.trim(),
      });
    }
  }
  return foundSpecs;
};

const collectRunningSpecs = (logLines) =>
  logLines.map(parseRunningSpecLine).filter(Boolean);

const collectSegment = (logLines, spec) => {
  let startIndex = -1;
  for (let index = 0; index < logLines.length; index += 1) {
    if (parseRunningSpecLine(logLines[index]) === spec) {
      startIndex = index;
    }
  }
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

const buildLogMessage = (segmentLines, summaryLine = "") => {
  const errorLines = segmentLines
    .map((line) => line.trim())
    .filter((line) => line && ERROR_HINT_PATTERN.test(line))
    .slice(-12);
  if (errorLines.length > 0) {
    return errorLines.join("\n");
  }

  const fallbackLines = segmentLines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-12);
  return (
    fallbackLines.join("\n") ||
    summaryLine ||
    "Cypress failed before it could persist JUnit or Allure results."
  );
};

const limitTrace = (trace) =>
  String(trace || "")
    .split(/\r?\n/)
    .slice(-MAX_TRACE_LINES)
    .join("\n");

const writeSyntheticFailure = ({
  resultsDir,
  spec,
  message,
  trace,
  counts,
  allureState,
}) => {
  const normalizedSpec = normalizeSpecPath(spec);
  const packageName = `${allureState.packagePrefix}${COMPONENT_PACKAGE_MARKER}${normalizedSpec.replaceAll("/", ".")}`;
  const specFilePath = `${COMPONENT_PATH_PREFIX}${normalizedSpec}`;
  const now = Date.now();
  const resultUuid = randomUUID();
  const outputPath = path.join(resultsDir, `${resultUuid}-result.json`);

  const payload = {
    uuid: resultUuid,
    name: `spec crash: ${normalizedSpec}`,
    fullName: `${allureState.fullNamePrefix}${specFilePath}#spec crash`,
    historyId: `${packageName}:spec-crash`,
    testCaseId: `${packageName}:spec-crash`,
    status: "broken",
    statusDetails: {
      message,
      trace: limitTrace(trace || message),
    },
    stage: "finished",
    steps: [],
    attachments: [],
    parameters: [
      { name: "Synthetic", value: SYNTHETIC_REASON },
      ...(counts
        ? [
            { name: "Spec tests", value: String(counts.total) },
            { name: "Spec passed", value: String(counts.passed) },
            { name: "Spec failed", value: String(counts.failed) },
            { name: "Spec pending", value: String(counts.pending) },
            { name: "Spec skipped", value: String(counts.skipped) },
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

const writeSyntheticRunnerFailure = ({
  resultsDir,
  message,
  trace,
  allureState,
}) => {
  const now = Date.now();
  const packageName = `${allureState.packagePrefix}${COMPONENT_PACKAGE_MARKER}runner`;
  const resultUuid = randomUUID();
  const outputPath = path.join(resultsDir, `${resultUuid}-result.json`);
  const payload = {
    uuid: resultUuid,
    name: "Cypress component runner failed",
    fullName: `${allureState.fullNamePrefix}cypress/component#runner failure`,
    historyId: `${packageName}:runner-failure`,
    testCaseId: `${packageName}:runner-failure`,
    status: "broken",
    statusDetails: { message, trace: limitTrace(trace || message) },
    stage: "finished",
    steps: [],
    attachments: [],
    parameters: [{ name: "Synthetic", value: SYNTHETIC_REASON }],
    labels: [
      { name: "language", value: "javascript" },
      { name: "framework", value: "cypress" },
      { name: "parentSuite", value: "Component Runner Failure" },
      { name: "suite", value: "Cypress component runner" },
      { name: "package", value: packageName },
    ],
    links: [],
    start: now,
    stop: now,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return outputPath;
};

const collectScreenshots = (screenshotsDir) => {
  if (!screenshotsDir || !fs.existsSync(screenshotsDir)) {
    return [];
  }

  return collectFilesByExtension(screenshotsDir, ".png")
    .map((filePath) => path.relative(screenshotsDir, filePath).replaceAll("\\", "/"))
    .slice(0, 15);
};

const escapeSummaryValue = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildStepSummary = ({
  junitResults,
  junitWarnings,
  runOutcome,
  screenshotsDir,
}) => {
  const counts = junitResults.reduce(
    (total, result) => {
      total.tests += result.total;
      total.failed += result.failed;
      total.skipped += result.skipped;
      total.durationSec += result.durationSec;
      return total;
    },
    { tests: 0, failed: 0, skipped: 0, durationSec: 0 },
  );
  const passed = Math.max(counts.tests - counts.failed - counts.skipped, 0);
  const failedTests = junitResults.flatMap((result) => result.failures);
  const headline =
    runOutcome === "success" && counts.failed === 0
      ? "Component Tests Passed"
      : "Component Tests Failed";

  let markdown = `## ${headline}\n\n`;
  markdown += "| Metric | Count |\n";
  markdown += "|---|---:|\n";
  markdown += `| Tests (total) | ${counts.tests} |\n`;
  markdown += `| Tests (passed) | ${passed} |\n`;
  markdown += `| Tests (failed) | ${counts.failed} |\n`;
  markdown += `| Tests (skipped) | ${counts.skipped} |\n`;
  markdown += `| Duration (seconds) | ${counts.durationSec.toFixed(2)} |\n\n`;

  if (junitResults.length === 0) {
    markdown += "JUnit report files were not found in `cypress/results`.\n\n";
  }
  for (const warning of junitWarnings) {
    markdown += `- ${escapeSummaryValue(warning)}\n`;
  }
  if (junitWarnings.length > 0) {
    markdown += "\n";
  }

  if (failedTests.length > 0) {
    markdown += "<details>\n";
    markdown += `<summary>Failed tests (${failedTests.length})</summary>\n\n`;
    for (const failure of failedTests.slice(0, 30)) {
      markdown += `- <strong>${escapeSummaryValue(failure.suite)} &gt; ${escapeSummaryValue(failure.name)}</strong>  \n`;
      markdown += `  <code>${escapeSummaryValue(failure.file)}</code>  \n`;
      markdown += `  ${escapeSummaryValue(failure.message.split("\n").find(Boolean) || failure.message)}\n`;
    }
    if (failedTests.length > 30) {
      markdown += `\n- ... and ${failedTests.length - 30} more\n`;
    }
    markdown += "\n</details>\n\n";
  }

  const screenshots = collectScreenshots(screenshotsDir);
  if (screenshots.length > 0) {
    markdown += "<details>\n";
    markdown += `<summary>Failed test screenshots (${screenshots.length})</summary>\n\n`;
    for (const screenshot of screenshots) {
      const screenshotPath = `cypress/screenshots/${screenshot}`;
      markdown += `- <code>${escapeSummaryValue(screenshotPath)}</code>\n`;
    }
    markdown += "\n</details>\n";
  }

  return markdown;
};

const parseRunOptions = (argv) => {
  const args = parseArgs(argv);
  return {
    resultsDir: resolveWorkspacePath(args["results-dir"], "results-dir", true),
    logFile: resolveWorkspacePath(args["log-file"], "log-file", true),
    junitDir: resolveWorkspacePath(args["junit-dir"], "junit-dir"),
    summaryFile: resolveWorkspacePath(args["summary-file"], "summary-file"),
    screenshotsDir: resolveWorkspacePath(
      args["screenshots-dir"],
      "screenshots-dir",
    ),
    runOutcome:
      typeof args["run-outcome"] === "string"
        ? args["run-outcome"].trim().toLowerCase()
        : "unknown",
  };
};

const readCypressLog = (logFile) => {
  const logLines = fs.existsSync(logFile)
    ? stripAnsi(readTextFile(logFile)).split(/\r?\n/)
    : [];
  if (!fs.existsSync(logFile)) {
    console.warn(`No Cypress log file found at ${logFile}; using JUnit only.`);
  }
  return logLines;
};

const createJunitCandidates = (junitResults) => {
  const candidates = new Map();
  for (const junitResult of junitResults) {
    if (junitResult.failed <= 0) {
      continue;
    }

    const firstFailure = junitResult.failures[0];
    candidates.set(junitResult.spec, {
      spec: junitResult.spec,
      message:
        firstFailure?.message ||
        `JUnit reported ${junitResult.failed} failed component tests.`,
      trace: firstFailure?.message || "",
      counts: {
        total: junitResult.total,
        passed: Math.max(
          junitResult.total - junitResult.failed - junitResult.skipped,
          0,
        ),
        failed: junitResult.failed,
        pending: 0,
        skipped: junitResult.skipped,
      },
    });
  }
  return candidates;
};

const addSummaryCandidates = (candidates, failingSummaries, logLines) => {
  for (const summary of failingSummaries.values()) {
    if (candidates.has(summary.spec)) {
      continue;
    }
    candidates.set(summary.spec, {
      spec: summary.spec,
      message: buildLogMessage(
        collectSegment(logLines, summary.spec),
        summary.summaryLine,
      ),
      trace: summary.summaryLine,
      counts: summary.counts,
    });
  }
};

const addActiveSpecCandidate = ({
  candidates,
  junitResults,
  logLines,
  runOutcome,
}) => {
  if (runOutcome !== "failure") {
    return;
  }
  const junitSpecs = new Set(junitResults.map((result) => result.spec));
  const runningSpecs = collectRunningSpecs(logLines);
  const missingStartedSpecs = runningSpecs.filter(
    (spec) => !junitSpecs.has(spec),
  );
  const activeSpec = missingStartedSpecs.at(-1);
  if (!activeSpec || candidates.has(activeSpec)) {
    return;
  }

  const activeSegment = collectSegment(logLines, activeSpec);
  candidates.set(activeSpec, {
    spec: activeSpec,
    message: buildLogMessage(activeSegment),
    trace: activeSegment.join("\n"),
    counts: null,
  });
};

const collectFailureCandidates = ({
  junitResults,
  failingSummaries,
  logLines,
  runOutcome,
}) => {
  const candidates = createJunitCandidates(junitResults);
  addSummaryCandidates(candidates, failingSummaries, logLines);
  addActiveSpecCandidate({
    candidates,
    junitResults,
    logLines,
    runOutcome,
  });
  return candidates;
};

const writeCandidateFailures = ({ candidates, resultsDir, allureState }) => {
  let created = 0;
  for (const candidate of candidates.values()) {
    if (hasAllureFailureForSpec(allureState, candidate.spec)) {
      continue;
    }
    writeSyntheticFailure({
      resultsDir,
      spec: candidate.spec,
      message: candidate.message,
      trace: candidate.trace,
      counts: candidate.counts,
      allureState,
    });
    allureState.failedSpecs.add(candidate.spec);
    allureState.hasFailure = true;
    created += 1;
  }
  return created;
};

const backfillRunnerFailure = ({
  junitResults,
  failingSummaries,
  runOutcome,
  logLines,
  resultsDir,
  allureState,
}) => {
  const hasRecordedFailure =
    junitResults.some((result) => result.failed > 0) ||
    failingSummaries.size > 0 ||
    allureState.hasFailure;
  if (runOutcome !== "failure" || hasRecordedFailure) {
    return 0;
  }

  const message = buildLogMessage(logLines);
  writeSyntheticRunnerFailure({
    resultsDir,
    message,
    trace: logLines.join("\n"),
    allureState,
  });
  return 1;
};

const appendStepSummary = ({
  summaryFile,
  junitResults,
  junitWarnings,
  runOutcome,
  screenshotsDir,
}) => {
  if (!summaryFile) {
    return;
  }
  const markdown = buildStepSummary({
    junitResults,
    junitWarnings,
    runOutcome,
    screenshotsDir,
  });
  fs.appendFileSync(summaryFile, markdown);
};

const runReconciliation = ({
  resultsDir,
  logFile,
  junitDir,
  summaryFile,
  screenshotsDir,
  runOutcome,
}) => {
  ensureDir(resultsDir);
  const logLines = readCypressLog(logFile);
  const { results: junitResults, warnings: junitWarnings } =
    collectJunitResults(junitDir);
  for (const warning of junitWarnings) {
    console.warn(warning);
  }

  const allureState = collectAllureState(resultsDir);
  const failingSummaries = extractFailingSpecsFromSummary(logLines);
  const candidates = collectFailureCandidates({
    junitResults,
    failingSummaries,
    logLines,
    runOutcome,
  });
  const candidateFailures = writeCandidateFailures({
    candidates,
    resultsDir,
    allureState,
  });
  const runnerFailures = backfillRunnerFailure({
    junitResults,
    failingSummaries,
    runOutcome,
    logLines,
    resultsDir,
    allureState,
  });
  appendStepSummary({
    summaryFile,
    junitResults,
    junitWarnings,
    runOutcome,
    screenshotsDir,
  });
  return candidateFailures + runnerFailures;
};

const main = () => {
  const created = runReconciliation(parseRunOptions(process.argv));
  console.log(`Synthetic Allure failures created: ${created}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
