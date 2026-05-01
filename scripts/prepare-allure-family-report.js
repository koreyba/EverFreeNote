#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  appendGithubOutput,
  computeReportContext,
  ensureDir,
  getSuiteMetadata,
  listify,
  normalizeSlashes,
  parseArgs,
} = require("./allure-pages-utils");

const SKIPPED_FILENAMES = new Set(["executor.json", "environment.properties", "categories.json"]);
const HISTORY_LIMIT = 20;

const isWithinDirectory = (baseDir, candidatePath) => {
  const relativePath = path.relative(baseDir, candidatePath);
  return relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
};

const ensureWithinWorkspace = (targetPath, optionName) => {
  const workspaceRoot = process.cwd();
  if (!isWithinDirectory(workspaceRoot, targetPath)) {
    throw new Error(`${optionName} must be inside repository workspace: ${targetPath}`);
  }
};

const addLabel = (labels, name, value) => {
  if (!value) return;
  if (labels.some((label) => label && label.name === name && label.value === value)) {
    return;
  }
  labels.push({ name, value });
};

const readDirectoryEntries = (dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return [];
    }
    throw error;
  }
};

const writeFileExclusive = (targetPath, writeOperation) => {
  try {
    writeOperation();
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`File collision while merging Allure results: ${targetPath}`);
    }
    throw error;
  }
};

const readAllureResultPayload = (sourcePath) => {
  try {
    return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch (error) {
    console.warn(`Skipping malformed Allure result file ${sourcePath}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
};

const writeMergedResultFile = (sourcePath, targetPath, suiteName, family) => {
  const payload = readAllureResultPayload(sourcePath);
  if (!payload) {
    return false;
  }

  const labels = Array.isArray(payload.labels) ? payload.labels : [];
  const suiteMetadata = getSuiteMetadata(suiteName);
  addLabel(labels, "family", family);
  addLabel(labels, "suite", suiteMetadata.suite);
  addLabel(labels, "surface", suiteMetadata.surface);
  addLabel(labels, "layer", suiteMetadata.layer);
  addLabel(labels, "workflow", suiteMetadata.workflow);
  payload.labels = labels;

  writeFileExclusive(targetPath, () => {
    fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, {
      flag: "wx",
    });
  });
  return true;
};

const copyAllureAsset = (sourcePath, targetPath) => {
  try {
    fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`File collision while merging Allure results: ${targetPath}`);
    }
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const copyDirectory = (sourceDir, targetDir, suiteName, family) => {
  let copiedFiles = 0;
  let resultFiles = 0;

  const visit = (currentSource, currentTarget) => {
    ensureDir(currentTarget);
    for (const entry of readDirectoryEntries(currentSource)) {
      const sourcePath = path.join(currentSource, entry.name);
      const targetPath = path.join(currentTarget, entry.name);

      if (entry.isDirectory()) {
        visit(sourcePath, targetPath);
        continue;
      }

      if (SKIPPED_FILENAMES.has(entry.name)) {
        continue;
      }

      if (entry.name.endsWith("-result.json")) {
        if (writeMergedResultFile(sourcePath, targetPath, suiteName, family)) {
          copiedFiles += 1;
          resultFiles += 1;
        }
        continue;
      }

      if (copyAllureAsset(sourcePath, targetPath)) {
        copiedFiles += 1;
      }
    }
  };

  visit(sourceDir, targetDir);
  return { copiedFiles, resultFiles };
};

const writeExecutorFile = (resultsDir, context, suites) => {
  const executor = {
    name: "GitHub Actions",
    type: "github",
    buildName: `${context.workflow || "workflow"} #${context.runId}`,
    buildOrder: Number.parseInt(context.runId, 10) || 0,
    buildUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${context.runId}`,
    reportName: `${context.familyLabel} Allure Report`,
    reportUrl: context.reportUrl,
  };

  const payload = {
    ...executor,
    description: suites.join(", "),
  };

  fs.writeFileSync(path.join(resultsDir, "executor.json"), `${JSON.stringify(payload, null, 2)}\n`);
};

const writeConfigFile = (configPath, reportDir, historyPath, context, suites) => {
  const variables = {
    Family: context.familyLabel,
    Suites: suites.join(", "),
    Scope: context.scopeLabel,
    Ref: context.refName,
    Commit: context.sha.slice(0, 7),
    Workflow: context.workflow || "unknown",
  };

  if (context.previewUrl) {
    variables["Preview URL"] = context.previewUrl;
  }

  if (context.e2eRef) {
    variables["E2E Ref"] = context.e2eRef;
  }

  const config = `const { defineConfig } = require("allure");

module.exports = defineConfig({
  name: ${JSON.stringify(`${context.familyLabel} Allure Report`)},
  output: ${JSON.stringify(reportDir)},
  ${historyPath ? `historyPath: ${JSON.stringify(historyPath)},` : ""}
  variables: ${JSON.stringify(variables, null, 2)},
  plugins: {
    awesome: {
      options: {
        reportName: ${JSON.stringify(`${context.familyLabel} Allure Report`)},
        singleFile: false,
        reportLanguage: "en",
        groupBy: ["layer", "surface", "suite"]
      }
    }
  }
});
`;

  fs.writeFileSync(configPath, config);
};

const parseInput = (item) => {
  const separatorIndex = item.indexOf("=");
  if (separatorIndex === -1) {
    throw new Error(`Invalid --input value '${item}', expected suite=path`);
  }

  const suite = item.slice(0, separatorIndex);
  const sourceDir = path.resolve(item.slice(separatorIndex + 1));
  if (!isWithinDirectory(process.cwd(), sourceDir)) {
    throw new Error(`Input path must be inside repository workspace: ${sourceDir}`);
  }

  return { suite, sourceDir };
};

const copyInputResults = (inputArgs, resultsDir, family) => {
  const suites = [];
  let copiedFiles = 0;
  let resultFiles = 0;

  for (const item of inputArgs) {
    const { suite, sourceDir } = parseInput(item);
    if (!fs.existsSync(sourceDir)) {
      continue;
    }

    const copyStats = copyDirectory(sourceDir, resultsDir, suite, family);
    if (copyStats.copiedFiles === 0) {
      continue;
    }

    suites.push(suite);
    copiedFiles += copyStats.copiedFiles;
    resultFiles += copyStats.resultFiles;
  }

  return { suites, copiedFiles, resultFiles };
};

const buildMetadata = ({
  family,
  context,
  suites,
  resultFiles,
  reportDir,
  resultsDir,
}) => ({
  family,
  familyLabel: context.familyLabel,
  suites,
  suiteLabels: suites.map((suite) => getSuiteMetadata(suite).label),
  path: context.reportDir,
  url: context.reportUrl,
  runId: context.runId,
  runAttempt: context.runAttempt,
  prNumber: context.prNumber,
  ref: context.refName,
  sha: context.sha,
  outcome: context.outcome,
  previewUrl: context.previewUrl || null,
  e2eRef: context.e2eRef || null,
  workflow: context.workflow || null,
  scopeType: context.scopeType,
  scopeLabel: context.scopeLabel,
  historyPath: context.historyPath || null,
  generatedAt: context.generatedAt,
  hasResults: resultFiles > 0,
  reportOutputDir: normalizeSlashes(path.relative(process.cwd(), reportDir)),
  combinedResultsDir: normalizeSlashes(path.relative(process.cwd(), resultsDir)),
});

const generateAllureReport = ({ resultFiles, resultsDir, reportDir, configPath, historyRoot, context, suiteLabels }) => {
  if (resultFiles === 0) {
    return;
  }

  writeExecutorFile(resultsDir, context, suiteLabels);
  const absoluteHistoryPath = context.historyPath ? path.join(historyRoot, context.historyPath) : "";
  if (absoluteHistoryPath) {
    ensureDir(path.dirname(absoluteHistoryPath));
  }
  writeConfigFile(configPath, reportDir, absoluteHistoryPath, context, suiteLabels);

  const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(npxExecutable, ["allure", "generate", resultsDir, "--config", configPath], {
    stdio: "inherit",
  });

  trimHistoryFile(absoluteHistoryPath, HISTORY_LIMIT);
};

const trimHistoryFile = (historyPath, limit) => {
  if (!historyPath || !fs.existsSync(historyPath)) {
    return;
  }

  const lines = fs
    .readFileSync(historyPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const retainedLines = lines.slice(-limit);
  fs.writeFileSync(historyPath, `${retainedLines.join("\n")}\n`);
};

const main = () => {
  const args = parseArgs(process.argv);
  const family = args.family;
  const inputArgs = listify(args.input);
  const workDir = path.resolve(args["work-dir"] || path.join(".allure-publish", family || "report"));
  const historyRoot = path.resolve(args["history-root"] || workDir);
  ensureWithinWorkspace(workDir, "--work-dir");
  ensureWithinWorkspace(historyRoot, "--history-root");

  if (!family) {
    throw new Error("--family is required");
  }

  if (inputArgs.length === 0) {
    throw new Error("At least one --input suite=path is required");
  }

  ensureDir(workDir);

  const resultsDir = path.join(workDir, "results");
  const reportDir = path.join(workDir, "report");
  const metadataPath = path.join(workDir, "metadata.json");
  const configPath = path.join(workDir, "allurerc.cjs");

  fs.rmSync(resultsDir, { recursive: true, force: true });
  fs.rmSync(reportDir, { recursive: true, force: true });
  ensureDir(resultsDir);

  const context = computeReportContext({ family });
  const { suites, copiedFiles, resultFiles } = copyInputResults(inputArgs, resultsDir, family);
  const metadata = buildMetadata({
    family,
    context,
    suites,
    resultFiles,
    reportDir,
    resultsDir,
  });

  generateAllureReport({ resultFiles, resultsDir, reportDir, configPath, historyRoot, context, suiteLabels: metadata.suiteLabels });

  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  appendGithubOutput(args["github-output"], {
    has_results: metadata.hasResults ? "true" : "false",
    report_dir: metadata.path,
    report_url: metadata.url,
    history_path: metadata.historyPath || "",
    metadata_path: metadataPath,
    report_output_dir: reportDir,
    combined_results_dir: resultsDir,
    suites: metadata.suites.join(","),
    copied_files: copiedFiles,
    result_files: resultFiles,
  });
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
