const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.join(
  __dirname,
  "backfill-cypress-spec-failures-to-allure.js",
);

const createFixture = (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "everfreenote-cypress-backfill-"),
  );
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const resultsDir = path.join(tempDir, "allure-results");
  const junitDir = path.join(tempDir, "junit");
  const logFile = path.join(tempDir, "component-tests.log");
  const summaryFile = path.join(tempDir, "step-summary.md");
  fs.mkdirSync(resultsDir);
  fs.mkdirSync(junitDir);

  return { tempDir, resultsDir, junitDir, logFile, summaryFile };
};

const runBackfill = ({
  tempDir,
  resultsDir,
  junitDir,
  logFile,
  summaryFile,
  runOutcome,
  env = {},
}) => {
  const args = [
    scriptPath,
    "--results-dir",
    resultsDir,
    "--log-file",
    logFile,
    "--junit-dir",
    junitDir,
  ];

  if (summaryFile) {
    args.push("--summary-file", summaryFile);
  }
  if (runOutcome) {
    args.push("--run-outcome", runOutcome);
  }

  return spawnSync(process.execPath, args, {
    cwd: tempDir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
};

const listAllureResultFiles = (resultsDir) =>
  fs
    .readdirSync(resultsDir)
    .filter((entry) => entry.endsWith("-result.json"));

const readAllureResults = (resultsDir) =>
  listAllureResultFiles(resultsDir)
    .map((entry) =>
      JSON.parse(fs.readFileSync(path.join(resultsDir, entry), "utf8")),
    );

const readSingleAllureResult = (resultsDir) => {
  const results = readAllureResults(resultsDir);
  assert.equal(results.length, 1, "expected exactly one Allure result");
  return results[0];
};

const writeFailedJunit = (junitDir, spec, message) => {
  fs.writeFileSync(
    path.join(junitDir, "component-tests-failed.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<testsuites name="Mocha Tests" tests="1" failures="1" time="0.650">',
      `  <testsuite name="Root Suite" tests="1" failures="1" file="cypress/component/${spec}" time="0.650">`,
      '    <testcase name="An uncaught error was detected outside of a test">',
      `      <failure message="${message}" type="ChunkLoadError" />`,
      "    </testcase>",
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );
};

test("backfills a broken result when Cypress renders zero counts as dashes", (t) => {
  const fixture = createFixture(t);
  const escape = String.fromCodePoint(27);
  const log = [
    `${escape}[90m  Running:  ${escape}[90mproviders/ThemeToggle.cy.tsx${escape}[39m  ${escape}[90m(21 of 102)${escape}[39m`,
    `${escape}[90m  │${escape}[39m ${escape}[31m✖${escape}[39m  ${escape}[0mproviders/ThemeToggle.cy.tsx${escape}[0m  ${escape}[90m650ms${escape}[39m  ${escape}[0m1${escape}[0m  ${escape}[90m-${escape}[39m  ${escape}[31m1${escape}[39m  ${escape}[90m-${escape}[39m  ${escape}[90m-${escape}[39m ${escape}[90m│${escape}[39m`,
  ].join("\n");
  fs.writeFileSync(fixture.logFile, log);

  const run = runBackfill(fixture);

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);

  const payload = readSingleAllureResult(fixture.resultsDir);
  assert.equal(payload.status, "broken");
  assert.equal(payload.name, "spec crash: providers/ThemeToggle.cy.tsx");
  assert.deepEqual(listAllureResultFiles(fixture.resultsDir), [
    `${payload.uuid}-result.json`,
  ]);

  const parameters = Object.fromEntries(
    payload.parameters.map(({ name, value }) => [name, value]),
  );
  assert.deepEqual(parameters, {
    Synthetic:
      "Generated because Cypress reported a component failure that had no failing Allure result.",
    "Spec tests": "1",
    "Spec passed": "0",
    "Spec failed": "1",
    "Spec pending": "0",
    "Spec skipped": "0",
  });

  const secondRun = runBackfill(fixture);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  assert.match(secondRun.stdout, /Synthetic Allure failures created: 0/);
  assert.equal(listAllureResultFiles(fixture.resultsDir).length, 1);
});

test("uses JUnit when Cypress wraps a long spec path in its console summary", (t) => {
  const fixture = createFixture(t);
  const spec =
    "ui/web/hooks/useVeryLongComponentControllerNameThatWraps.cy.tsx";
  fs.writeFileSync(
    fixture.logFile,
    [
      `  Running:  ${spec}  (21 of 102)`,
      "  │ ✖  ui/web/hooks/useVeryLongComponentControllerNameThatWra  650ms  1  -  1  -  - │",
      "  │    ps.cy.tsx                                                        │",
    ].join("\n"),
  );
  writeFailedJunit(
    fixture.junitDir,
    spec,
    "ChunkLoadError: Loading wrapped component spec failed.",
  );

  const run = runBackfill({ ...fixture, runOutcome: "failure" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);
  const payload = readSingleAllureResult(fixture.resultsDir);
  assert.equal(payload.name, `spec crash: ${spec}`);
  assert.equal(
    payload.statusDetails.message,
    "ChunkLoadError: Loading wrapped component spec failed.",
  );
});

test("does not duplicate a real Allure failure with the project package prefix", (t) => {
  const fixture = createFixture(t);
  const spec = "providers/ThemeToggle.cy.tsx";
  fs.writeFileSync(
    fixture.logFile,
    `  │ ✖  ${spec}  650ms  1  -  1  -  - │`,
  );
  writeFailedJunit(
    fixture.junitDir,
    spec,
    "ChunkLoadError: Loading component spec failed.",
  );
  fs.writeFileSync(
    path.join(fixture.resultsDir, "existing-result.json"),
    JSON.stringify({
      status: "failed",
      fullName: `everfreenote:cypress/component/${spec}#ThemeToggle fails`,
      labels: [
        {
          name: "package",
          value: "everfreenote.cypress.component.providers.ThemeToggle.cy.tsx",
        },
      ],
    }),
  );

  const run = runBackfill({ ...fixture, runOutcome: "failure" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 0/);
  assert.equal(readAllureResults(fixture.resultsDir).length, 1);
});

test("tolerates an Allure payload whose labels value is not an array", (t) => {
  const fixture = createFixture(t);
  fs.writeFileSync(fixture.logFile, "");
  fs.writeFileSync(
    path.join(fixture.resultsDir, "malformed-labels-result.json"),
    JSON.stringify({
      fullName: "everfreenote:cypress/component/providers/ThemeToggle.cy.tsx",
      labels: { name: "package", value: "not-an-array" },
      status: "passed",
    }),
  );

  const run = runBackfill({ ...fixture, runOutcome: "success" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 0/);
});

test("backfills the active spec when Cypress crashes before JUnit and summary output", (t) => {
  const fixture = createFixture(t);
  fs.writeFileSync(
    fixture.logFile,
    [
      "  Running:  providers/ThemeToggle.cy.tsx  (21 of 102)",
      "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory",
    ].join("\n"),
  );

  const run = runBackfill({ ...fixture, runOutcome: "failure" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);
  const payload = readSingleAllureResult(fixture.resultsDir);
  assert.equal(payload.name, "spec crash: providers/ThemeToggle.cy.tsx");
  assert.match(payload.statusDetails.message, /heap out of memory/i);
});

test("backfills a runner failure when Cypress exits before starting a spec", (t) => {
  const fixture = createFixture(t);
  const logLines = Array.from(
    { length: 600 },
    (_, index) => `diagnostic line ${index}`,
  );
  logLines.push("Error: Cypress configuration could not be loaded");
  fs.writeFileSync(fixture.logFile, logLines.join("\n"));

  const run = runBackfill({ ...fixture, runOutcome: "failure" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);
  const payload = readSingleAllureResult(fixture.resultsDir);
  assert.equal(payload.name, "Cypress component runner failed");
  assert.match(payload.statusDetails.message, /configuration could not be loaded/i);
  assert.equal(payload.statusDetails.trace.split("\n").length, 500);
  assert.doesNotMatch(payload.statusDetails.trace, /diagnostic line 0(?:\D|$)/);
});

test("uses top-level JUnit totals once when suites are nested", (t) => {
  const fixture = createFixture(t);
  fs.writeFileSync(fixture.logFile, "");
  fs.writeFileSync(
    path.join(fixture.junitDir, "component-tests-nested.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<testsuites name="Mocha Tests" tests="6" failures="0" time="0.679">',
      '  <testsuite name="Root Suite" tests="0" file="cypress/component/core/services/SearchService.cy.ts" time="0.000" failures="0" />',
      '  <testsuite name="searchNotes" tests="6" time="0.630" failures="0">',
      '    <testcase name="test 1" />',
      '    <testcase name="test 2" />',
      '    <testcase name="test 3" />',
      '    <testcase name="test 4" />',
      '    <testcase name="test 5" />',
      '    <testcase name="test 6" />',
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );

  const run = runBackfill({
    ...fixture,
    runOutcome: "success",
    summaryFile: fixture.summaryFile,
  });

  assert.equal(run.status, 0, run.stderr);
  const summary = fs.readFileSync(fixture.summaryFile, "utf8");
  assert.match(summary, /\| Tests \(total\) \| 6 \|/);
  assert.match(summary, /\| Tests \(passed\) \| 6 \|/);
  assert.doesNotMatch(summary, /\| Tests \(total\) \| 12 \|/);
});

test("uses only the latest JUnit report when a spec is retried", (t) => {
  const fixture = createFixture(t);
  fs.writeFileSync(fixture.logFile, "");
  const olderReport = path.join(fixture.junitDir, "component-tests-older.xml");
  const newerReport = path.join(fixture.junitDir, "component-tests-newer.xml");
  const spec = "providers/ThemeToggle.cy.tsx";
  fs.writeFileSync(
    olderReport,
    [
      '<testsuites tests="1" failures="1" skipped="0" time="0.5">',
      `  <testsuite file="cypress/component/${spec}" tests="1" failures="1">`,
      '    <testcase name="old attempt"><failure message="old failure" /></testcase>',
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );
  fs.writeFileSync(
    newerReport,
    [
      '<testsuites tests="2" failures="0" skipped="0" time="0.7">',
      `  <testsuite file="cypress/component/${spec}" tests="2" failures="0">`,
      '    <testcase name="retry passed" />',
      '    <testcase name="second test passed" />',
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );
  fs.utimesSync(olderReport, new Date(1_000), new Date(1_000));
  fs.utimesSync(newerReport, new Date(2_000), new Date(2_000));

  const run = runBackfill({
    ...fixture,
    runOutcome: "success",
    summaryFile: fixture.summaryFile,
  });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 0/);
  const summary = fs.readFileSync(fixture.summaryFile, "utf8");
  assert.match(summary, /\| Tests \(total\) \| 2 \|/);
  assert.match(summary, /\| Tests \(passed\) \| 2 \|/);
  assert.match(summary, /\| Tests \(failed\) \| 0 \|/);
  assert.doesNotMatch(summary, /\| Tests \(total\) \| 3 \|/);
});

test("rejects output paths outside the workspace", (t) => {
  const fixture = createFixture(t);
  const outsideDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "everfreenote-cypress-outside-"),
  );
  t.after(() => fs.rmSync(outsideDir, { recursive: true, force: true }));
  fs.writeFileSync(fixture.logFile, "");

  const run = runBackfill({ ...fixture, resultsDir: outsideDir });

  assert.equal(run.status, 1);
  assert.match(run.stderr, /--results-dir must stay within the workspace/);
});

test("accepts the GitHub step summary command file outside the workspace", (t) => {
  const fixture = createFixture(t);
  const runnerTempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "everfreenote-runner-temp-"),
  );
  t.after(() => fs.rmSync(runnerTempDir, { recursive: true, force: true }));
  const githubSummaryFile = path.join(runnerTempDir, "step-summary.md");
  fs.writeFileSync(fixture.logFile, "");

  const run = runBackfill({
    ...fixture,
    runOutcome: "success",
    summaryFile: githubSummaryFile,
    env: { GITHUB_STEP_SUMMARY: githubSummaryFile },
  });

  assert.equal(run.status, 0, run.stderr);
  assert.match(
    fs.readFileSync(githubSummaryFile, "utf8"),
    /## Component Tests Passed/,
  );

  const rejectedRun = runBackfill({
    ...fixture,
    runOutcome: "success",
    summaryFile: path.join(runnerTempDir, "different-summary.md"),
    env: { GITHUB_STEP_SUMMARY: githubSummaryFile },
  });
  assert.equal(rejectedRun.status, 1);
  assert.match(rejectedRun.stderr, /--summary-file must stay within the workspace/);
});

test("HTML-encodes dynamic JUnit values in the GitHub step summary", (t) => {
  const fixture = createFixture(t);
  writeFailedJunit(
    fixture.junitDir,
    "providers/ThemeToggle.cy.tsx",
    "&lt;img src=x onerror=alert(1)&gt;",
  );

  const run = runBackfill({
    ...fixture,
    runOutcome: "failure",
    summaryFile: fixture.summaryFile,
  });

  assert.equal(run.status, 0, run.stderr);
  const summary = fs.readFileSync(fixture.summaryFile, "utf8");
  assert.match(summary, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(summary, /<img src=x onerror=alert\(1\)>/);
});
