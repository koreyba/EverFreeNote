#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./allure-pages-utils");

const readRetained = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return new Set();
  }
  return new Set(
    fs
      .readFileSync(filePath, "utf8")
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
  fs.rmSync(reportPath, { recursive: true, force: true });
  removeEmptyParents(root, reportPath);
};

const removeEmptyParents = (root, currentPath) => {
  const resolvedRoot = path.resolve(root);
  let cursor = path.resolve(path.dirname(currentPath));
  while (cursor !== resolvedRoot) {
    if (!isDescendant(resolvedRoot, cursor)) {
      break;
    }

    if (fs.existsSync(cursor) && fs.readdirSync(cursor).length !== 0) {
      break;
    }

    if (fs.existsSync(cursor)) {
      fs.rmSync(cursor, { recursive: true, force: true });
    }
    cursor = path.dirname(cursor);
  }
};

const pruneReportDirectories = (root, retainedPaths) => {
  const reportsRoot = path.join(root, "reports");
  if (!fs.existsSync(reportsRoot)) {
    return;
  }

  for (const family of listDirectories(reportsRoot)) {
    const familyPath = path.join(reportsRoot, family.name);
    for (const scope of listDirectories(familyPath)) {
      const scopePath = path.join(familyPath, scope.name);
      for (const run of listDirectories(scopePath)) {
        const runPath = path.join(scopePath, run.name);
        const relativePath = path.relative(root, runPath).replaceAll(path.sep, "/");
        if (!retainedPaths.has(relativePath)) {
          removeReportDirectory(root, runPath);
        }
      }
    }
  }
};

const pruneHistoryFiles = (root, retainedHistoryPaths) => {
  const historyRoot = path.join(root, "_history");
  if (!fs.existsSync(historyRoot)) {
    return;
  }

  const visit = (currentDir) => {
    for (const entry of listEntries(currentDir)) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        if (fs.existsSync(entryPath) && fs.readdirSync(entryPath).length === 0) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
        continue;
      }

      const relativePath = path.relative(root, entryPath).replaceAll(path.sep, "/");
      if (!retainedHistoryPaths.has(relativePath)) {
        fs.rmSync(entryPath, { force: true });
      }
    }
  };

  visit(historyRoot);
};

const main = () => {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || ".");
  const retainedPaths = readRetained(args["reports-list"] ? path.resolve(args["reports-list"]) : "");
  const retainedHistoryPaths = readRetained(args["history-list"] ? path.resolve(args["history-list"]) : "");

  pruneReportDirectories(root, retainedPaths);
  pruneHistoryFiles(root, retainedHistoryPaths);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
