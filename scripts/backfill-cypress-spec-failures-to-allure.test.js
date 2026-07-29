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
  resultsDir,
  junitDir,
  logFile,
  summaryFile,
  runOutcome,
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

  return spawnSync(process.execPath, args, { encoding: "utf8" });
};

const readAllureResults = (resultsDir) =>
  fs
    .readdirSync(resultsDir)
    .filter((entry) => entry.endsWith("-result.json"))
    .map((entry) =>
      JSON.parse(fs.readFileSync(path.join(resultsDir, entry), "utf8")),
    );

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

  const [payload] = readAllureResults(fixture.resultsDir);
  assert.equal(payload.status, "broken");
  assert.equal(payload.name, "spec crash: providers/ThemeToggle.cy.tsx");

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
  const [payload] = readAllureResults(fixture.resultsDir);
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
  const [payload] = readAllureResults(fixture.resultsDir);
  assert.equal(payload.name, "spec crash: providers/ThemeToggle.cy.tsx");
  assert.match(payload.statusDetails.message, /heap out of memory/i);
});

test("backfills a runner failure when Cypress exits before starting a spec", (t) => {
  const fixture = createFixture(t);
  fs.writeFileSync(
    fixture.logFile,
    "Error: Cypress configuration could not be loaded",
  );

  const run = runBackfill({ ...fixture, runOutcome: "failure" });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);
  const [payload] = readAllureResults(fixture.resultsDir);
  assert.equal(payload.name, "Cypress component runner failed");
  assert.match(payload.statusDetails.message, /configuration could not be loaded/i);
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
