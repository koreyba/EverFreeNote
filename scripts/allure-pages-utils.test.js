const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  appendGithubOutput,
  ensureGithubOutputPath,
  ensureWithinDirectory,
  ensureWithinWorkspace,
  readJson,
} = require("./allure-pages-utils");

const makeWorkspaceFixture = (t) => {
  const fixtureDir = fs.mkdtempSync(
    path.join(process.cwd(), ".tmp-allure-pages-utils-"),
  );
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));
  return fixtureDir;
};

test("accepts non-existing descendants and rejects lexical workspace escapes", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const nestedOutput = path.join(fixtureDir, "generated", "index.html");

  assert.equal(ensureWithinWorkspace(nestedOutput, "--output"), nestedOutput);
  assert.throws(
    () => ensureWithinWorkspace(path.resolve(process.cwd(), "..", "outside"), "--output"),
    /must be inside repository workspace/,
  );
});

test("returns canonical paths for non-existing descendants below an in-workspace link", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const canonicalDirectory = path.join(fixtureDir, "canonical");
  const linkedDirectory = path.join(fixtureDir, "linked");
  fs.mkdirSync(canonicalDirectory);
  fs.symlinkSync(
    canonicalDirectory,
    linkedDirectory,
    process.platform === "win32" ? "junction" : "dir",
  );

  assert.equal(
    ensureWithinWorkspace(path.join(linkedDirectory, "generated", "index.html"), "--output"),
    path.join(canonicalDirectory, "generated", "index.html"),
  );
});

test("rejects symlinked ancestors and dangling symlinks", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "everfreenote-pages-outside-"));
  t.after(() => fs.rmSync(outsideDir, { recursive: true, force: true }));

  const linkedDirectory = path.join(fixtureDir, "linked");
  fs.symlinkSync(
    outsideDir,
    linkedDirectory,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(
    () => ensureWithinWorkspace(path.join(linkedDirectory, "generated"), "--output"),
    /resolves outside repository workspace/,
  );

  const danglingLink = path.join(fixtureDir, "dangling");
  const danglingTarget = fs.mkdtempSync(
    path.join(os.tmpdir(), "everfreenote-pages-dangling-target-"),
  );
  fs.symlinkSync(
    danglingTarget,
    danglingLink,
    process.platform === "win32" ? "junction" : "dir",
  );
  fs.rmSync(danglingTarget, { recursive: true, force: true });
  assert.throws(() => ensureWithinWorkspace(danglingLink, "--output"));
});

test("readJson does not turn an unsafe path into a fallback value", () => {
  const outsidePath = path.resolve(process.cwd(), "..", "not-allowed.json");

  assert.throws(
    () => readJson(outsidePath, { safe: false }),
    /must be inside repository workspace/,
  );
});

test("allows only the configured GitHub output file outside the workspace", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "everfreenote-github-output-"));
  t.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
  const outputPath = path.join(outputDir, "github-output");
  const previousGithubOutput = process.env.GITHUB_OUTPUT;

  try {
    process.env.GITHUB_OUTPUT = outputPath;
    assert.equal(ensureGithubOutputPath(outputPath), fs.realpathSync.native(outputDir) + path.sep + "github-output");
    appendGithubOutput(outputPath, { metadata: path.join(fixtureDir, "metadata.json") });
    assert.match(fs.readFileSync(outputPath, "utf8"), /metadata=/);
    assert.throws(
      () => ensureGithubOutputPath(path.join(outputDir, "different-output")),
      /must match GITHUB_OUTPUT/,
    );
  } finally {
    if (previousGithubOutput === undefined) {
      delete process.env.GITHUB_OUTPUT;
    } else {
      process.env.GITHUB_OUTPUT = previousGithubOutput;
    }
  }
});

test("keeps retained-list files inside the prune root", (t) => {
  const fixtureDir = makeWorkspaceFixture(t);
  const retainedList = path.join(fixtureDir, "reports", "retained-paths.txt");
  fs.mkdirSync(path.dirname(retainedList), { recursive: true });
  fs.writeFileSync(retainedList, "reports/allure/pr-1/run-1\n");

  assert.equal(
    ensureWithinDirectory(retainedList, "--reports-list", fixtureDir),
    retainedList,
  );
  assert.throws(
    () =>
      ensureWithinDirectory(
        path.resolve(fixtureDir, "..", "retained-paths.txt"),
        "--reports-list",
        fixtureDir,
      ),
    /must stay within/,
  );
});
