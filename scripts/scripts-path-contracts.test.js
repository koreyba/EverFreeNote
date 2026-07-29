const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workspaceRoot = process.cwd();

const makeWorkspaceFixture = (t) => {
  const fixtureDir = fs.mkdtempSync(path.join(workspaceRoot, ".tmp-script-contracts-"));
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
  return fixtureDir;
};

const makeOutsideFixture = (t, prefix) => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
  return fixtureDir;
};

const runScript = (scriptName, args, env = {}) =>
  spawnSync(
    process.execPath,
    [path.join(workspaceRoot, "scripts", scriptName), ...args],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );

const createDirectoryLink = (target, linkPath) =>
  fs.symlinkSync(
    target,
    linkPath,
    process.platform === "win32" ? "junction" : "dir",
  );

test("report-index CLIs preserve valid output and reject escaped or symlinked paths", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const outsideDir = makeOutsideFixture(t, "everfreenote-index-outside-");
  const currentPath = path.join(fixtureDir, "current.json");
  const existingPath = path.join(fixtureDir, "existing.json");
  const outputDir = path.join(fixtureDir, "output");
  const symlinkedOutput = path.join(fixtureDir, "symlinked-output");

  fs.writeFileSync(
    currentPath,
    JSON.stringify({
      family: "allure",
      path: "reports/allure/pr-1/run-1",
      generatedAt: "2026-07-29T12:00:00Z",
    }),
  );
  fs.writeFileSync(existingPath, "[]\n");

  const allureRun = runScript("generate-allure-report-index.js", [
    "--current",
    currentPath,
    "--existing",
    existingPath,
    "--output",
    outputDir,
  ]);
  assert.equal(allureRun.status, 0, allureRun.stderr);
  assert.equal(fs.existsSync(path.join(outputDir, "index.html")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "reports", "index.json")), true);

  const escapedAllureRun = runScript("generate-allure-report-index.js", [
    "--output",
    path.resolve(workspaceRoot, "..", "outside-pages"),
  ]);
  assert.equal(escapedAllureRun.status, 1);
  assert.match(escapedAllureRun.stderr, /--output must be inside repository workspace/);

  createDirectoryLink(outsideDir, symlinkedOutput);
  const symlinkedAllureRun = runScript("generate-allure-report-index.js", [
    "--output",
    symlinkedOutput,
  ]);
  assert.equal(symlinkedAllureRun.status, 1);
  assert.match(symlinkedAllureRun.stderr, /--output resolves outside repository workspace/);

  const e2eOutputDir = path.join(fixtureDir, "e2e-output");
  const e2eRun = runScript(
    "generate-e2e-report-index.js",
    ["--existing", existingPath, "--output", e2eOutputDir],
    {
      REPORT_URL: "https://example.test/e2e",
      REPORT_DIR: "reports/e2e/pr-1/run-1",
      GITHUB_RUN_ID: "1",
      GITHUB_RUN_ATTEMPT: "1",
    },
  );
  assert.equal(e2eRun.status, 0, e2eRun.stderr);
  assert.equal(fs.existsSync(path.join(e2eOutputDir, "index.html")), true);

  const escapedE2eRun = runScript("generate-e2e-report-index.js", [
    "--existing",
    path.resolve(workspaceRoot, "..", "outside-existing.json"),
  ]);
  assert.equal(escapedE2eRun.status, 1);
  assert.match(escapedE2eRun.stderr, /--existing must be inside repository workspace/);
});

test("prepare CLI keeps inputs/work/history contained and permits only GITHUB_OUTPUT outside it", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const outsideDir = makeOutsideFixture(t, "everfreenote-prepare-outside-");
  const inputDir = path.join(fixtureDir, "input");
  const workDir = path.join(fixtureDir, "work");
  const historyRoot = path.join(fixtureDir, "history");
  const githubOutput = path.join(outsideDir, "github-output");
  fs.mkdirSync(inputDir, { recursive: true });

  const validRun = runScript(
    "prepare-allure-family-report.js",
    [
      "--family",
      "allure",
      "--work-dir",
      workDir,
      "--history-root",
      historyRoot,
      "--input",
      `core-unit=${inputDir}`,
      "--github-output",
      githubOutput,
    ],
    { GITHUB_OUTPUT: githubOutput },
  );
  assert.equal(validRun.status, 0, validRun.stderr);
  assert.equal(fs.existsSync(path.join(workDir, "metadata.json")), true);
  assert.match(fs.readFileSync(githubOutput, "utf8"), /metadata_path=/);

  const escapedInputRun = runScript("prepare-allure-family-report.js", [
    "--family",
    "allure",
    "--work-dir",
    path.join(fixtureDir, "escaped-work"),
    "--input",
    `core-unit=${path.resolve(workspaceRoot, "..", "outside-input")}`,
  ]);
  assert.equal(escapedInputRun.status, 1);
  assert.match(escapedInputRun.stderr, /--input must be inside repository workspace/);

  const mismatchedOutputRun = runScript(
    "prepare-allure-family-report.js",
    [
      "--family",
      "allure",
      "--work-dir",
      path.join(fixtureDir, "different-work"),
      "--input",
      `core-unit=${inputDir}`,
      "--github-output",
      path.join(outsideDir, "different-output"),
    ],
    { GITHUB_OUTPUT: githubOutput },
  );
  assert.equal(mismatchedOutputRun.status, 1);
  assert.match(mismatchedOutputRun.stderr, /--github-output must match GITHUB_OUTPUT/);
});

test("prune and render CLIs reject unsafe list, report-index, root, and output paths", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const outsideDir = makeOutsideFixture(t, "everfreenote-prune-outside-");
  const root = path.join(fixtureDir, "pages");
  const retainedList = path.join(root, "reports", "retained-paths.txt");
  const historyList = path.join(root, "reports", "retained-history-paths.txt");
  const outsideList = path.join(outsideDir, "retained-paths.txt");
  const reportsIndex = path.join(fixtureDir, "reports-index.json");

  fs.mkdirSync(path.dirname(retainedList), { recursive: true });
  fs.writeFileSync(retainedList, "reports/allure/pr-1/run-1\n");
  fs.writeFileSync(historyList, "_history/allure/history.jsonl\n");
  fs.writeFileSync(outsideList, "reports/allure/pr-1/run-1\n");
  fs.writeFileSync(reportsIndex, "[]\n");

  const escapedListRun = runScript("prune-allure-pages.js", [
    "--root",
    root,
    "--reports-list",
    outsideList,
  ]);
  assert.equal(escapedListRun.status, 1);
  assert.match(escapedListRun.stderr, /--reports-list must stay within/);

  const escapedRootRun = runScript("prune-allure-pages.js", [
    "--root",
    path.resolve(workspaceRoot, "..", "outside-pages"),
  ]);
  assert.equal(escapedRootRun.status, 1);
  assert.match(escapedRootRun.stderr, /--root must be inside repository workspace/);

  const missingRootRun = runScript("prune-allure-pages.js", [
    "--root",
    path.join(fixtureDir, "missing-pages"),
  ]);
  assert.equal(missingRootRun.status, 0, missingRootRun.stderr);

  const escapedReportIndexRun = runScript("render-pr-status-comment.js", [
    "--repository",
    "koreyba/EverFreeNote",
    "--pr-number",
    "1",
    "--head-sha",
    "a".repeat(40),
    "--reports-index",
    path.resolve(workspaceRoot, "..", "outside-reports.json"),
  ]);
  assert.equal(escapedReportIndexRun.status, 1);
  assert.match(escapedReportIndexRun.stderr, /--reports-index must be inside repository workspace/);

  const escapedCommentOutputRun = runScript("render-pr-status-comment.js", [
    "--repository",
    "koreyba/EverFreeNote",
    "--pr-number",
    "1",
    "--head-sha",
    "a".repeat(40),
    "--output",
    path.resolve(workspaceRoot, "..", "outside-comment.md"),
  ]);
  assert.equal(escapedCommentOutputRun.status, 1);
  assert.match(escapedCommentOutputRun.stderr, /--output must be inside repository workspace/);
});
