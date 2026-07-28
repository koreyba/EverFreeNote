const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("backfills a broken Allure result when Cypress renders zero counts as dashes", (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "everfreenote-cypress-backfill-"),
  );
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const resultsDir = path.join(tempDir, "allure-results");
  const junitDir = path.join(tempDir, "junit");
  const logFile = path.join(tempDir, "component-tests.log");
  const escape = String.fromCodePoint(27);
  const log = [
    `${escape}[90m  Running:  ${escape}[90mproviders/ThemeToggle.cy.tsx${escape}[39m  ${escape}[90m(21 of 102)${escape}[39m`,
    `${escape}[90m  │${escape}[39m ${escape}[31m✖${escape}[39m  ${escape}[0mproviders/ThemeToggle.cy.tsx${escape}[0m  ${escape}[90m650ms${escape}[39m  ${escape}[0m1${escape}[0m  ${escape}[90m-${escape}[39m  ${escape}[31m1${escape}[39m  ${escape}[90m-${escape}[39m  ${escape}[90m-${escape}[39m ${escape}[90m│${escape}[39m`,
  ].join("\n");
  fs.writeFileSync(logFile, log);
  fs.mkdirSync(junitDir);
  fs.writeFileSync(
    path.join(junitDir, "component-tests-theme-toggle.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<testsuites name="Mocha Tests" tests="1" failures="1">',
      '  <testsuite name="Root Suite" tests="1" failures="1" file="cypress/component/providers/ThemeToggle.cy.tsx">',
      '    <testcase name="An uncaught error was detected outside of a test">',
      '      <failure message="ChunkLoadError: Loading chunk failed.&#10;Cypress could not associate this error to any specific test." type="ChunkLoadError" />',
      "    </testcase>",
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );

  const scriptPath = path.join(
    __dirname,
    "backfill-cypress-spec-failures-to-allure.js",
  );
  const run = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--results-dir",
      resultsDir,
      "--log-file",
      logFile,
      "--junit-dir",
      junitDir,
    ],
    { encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Synthetic Allure failures created: 1/);

  const resultFiles = fs
    .readdirSync(resultsDir)
    .filter((entry) => entry.endsWith("-result.json"));
  assert.equal(resultFiles.length, 1);

  const payload = JSON.parse(
    fs.readFileSync(path.join(resultsDir, resultFiles[0]), "utf8"),
  );
  assert.equal(payload.status, "broken");
  assert.equal(payload.name, "spec crash: providers/ThemeToggle.cy.tsx");
  assert.equal(
    payload.statusDetails.message,
    "ChunkLoadError: Loading chunk failed.\nCypress could not associate this error to any specific test.",
  );

  const parameters = Object.fromEntries(
    payload.parameters.map(({ name, value }) => [name, value]),
  );
  assert.deepEqual(parameters, {
    Synthetic:
      "Generated from Cypress component runner log because Allure adapter emitted no failing result.",
    "Spec tests": "1",
    "Spec passed": "0",
    "Spec failed": "1",
    "Spec pending": "0",
    "Spec skipped": "0",
  });
});
