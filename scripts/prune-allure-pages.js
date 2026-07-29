#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  ensureWithinDirectory,
  ensureWithinWorkspace,
  parseArgs,
} = require("./allure-pages-utils");

const assertCanonicalWorkspacePath = (candidatePath, optionName) => {
  const workspaceRoot = fs.realpathSync.native(process.cwd());
  if (
    candidatePath !== workspaceRoot &&
    !candidatePath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new Error(`${optionName} resolves outside repository workspace: ${candidatePath}`);
  }
  return candidatePath;
};

const readRetained = (filePath, optionName) => {
  if (!filePath) {
    return new Set();
  }
  const safeFilePath = ensureWithinWorkspace(filePath, optionName);
  assertCanonicalWorkspacePath(safeFilePath, optionName);
  if (!fs.existsSync(safeFilePath)) {
    return new Set();
  }
  return new Set(
    fs
      .readFileSync(safeFilePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
};

const listDirectories = (dirPath) =>
  fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

const listEntries = (dirPath) => fs.readdirSync(dirPath, { withFileTypes: true });

const isDescendant = (root, candidatePath) => {
  const relativePath = path.relative(path.resolve(root), path.resolve(candidatePath));
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
};

const removeReportDirectory = (root, reportPath) => {
  const safeReportPath = ensureWithinDirectory(reportPath, "report path", root);
  fs.rmSync(safeReportPath, { recursive: true, force: true });
  removeEmptyParents(root, safeReportPath);
};

const removeEmptyParents = (root, currentPath) => {
  const resolvedRoot = path.resolve(root);
  let cursor = path.resolve(path.dirname(currentPath));
  while (cursor !== resolvedRoot) {
    if (!isDescendant(resolvedRoot, cursor)) {
      break;
    }

    const safeCursor = ensureWithinDirectory(cursor, "empty parent path", resolvedRoot);
    if (fs.existsSync(safeCursor) && fs.readdirSync(safeCursor).length !== 0) {
      break;
    }

    if (fs.existsSync(safeCursor)) {
      fs.rmSync(safeCursor, { recursive: true, force: true });
    }
    cursor = path.dirname(cursor);
  }
};

const collectReportRunPaths = (root) => {
  const reportsRoot = ensureWithinDirectory(path.join(root, "reports"), "reports root", root);
  if (!fs.existsSync(reportsRoot)) {
    return [];
  }

  const runPaths = [];
  for (const family of listDirectories(reportsRoot)) {
    const familyPath = path.join(reportsRoot, family.name);
    for (const scope of listDirectories(familyPath)) {
      const scopePath = path.join(familyPath, scope.name);
      for (const run of listDirectories(scopePath)) {
        runPaths.push(path.join(scopePath, run.name));
      }
    }
  }
  return runPaths;
};

const isRetainedReportPath = (root, runPath, retainedPaths) => {
  const relativePath = path.relative(root, runPath).replaceAll(path.sep, "/");
  return retainedPaths.has(relativePath);
};

const pruneReportDirectories = (root, retainedPaths) => {
  for (const runPath of collectReportRunPaths(root)) {
    if (!isRetainedReportPath(root, runPath, retainedPaths)) {
      removeReportDirectory(root, runPath);
    }
  }
};

const pruneHistoryFiles = (root, retainedHistoryPaths) => {
  const historyRoot = ensureWithinDirectory(path.join(root, "_history"), "history root", root);
  if (!fs.existsSync(historyRoot)) {
    return;
  }

  const visit = (currentDir) => {
    const safeCurrentDir = ensureWithinDirectory(currentDir, "history directory", root);
    for (const entry of listEntries(safeCurrentDir)) {
      const entryPath = path.join(safeCurrentDir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        const safeEntryPath = ensureWithinDirectory(entryPath, "empty history directory", root);
        if (fs.existsSync(safeEntryPath) && fs.readdirSync(safeEntryPath).length === 0) {
          fs.rmSync(safeEntryPath, { recursive: true, force: true });
        }
        continue;
      }

      const relativePath = path.relative(root, entryPath).replaceAll(path.sep, "/");
      if (!retainedHistoryPaths.has(relativePath)) {
        const safeEntryPath = ensureWithinDirectory(entryPath, "history file", root);
        fs.rmSync(safeEntryPath, { force: true });
      }
    }
  };

  visit(historyRoot);
};

const main = () => {
  const args = parseArgs(process.argv);
  const root = ensureWithinWorkspace(args.root || ".", "--root");
  const reportsListPath = args["reports-list"]
    ? ensureWithinDirectory(path.resolve(args["reports-list"]), "--reports-list", root)
    : "";
  const historyListPath = args["history-list"]
    ? ensureWithinDirectory(path.resolve(args["history-list"]), "--history-list", root)
    : "";
  const retainedPaths = readRetained(reportsListPath, "--reports-list");
  const retainedHistoryPaths = readRetained(historyListPath, "--history-list");

  pruneReportDirectories(root, retainedPaths);
  pruneHistoryFiles(root, retainedHistoryPaths);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
