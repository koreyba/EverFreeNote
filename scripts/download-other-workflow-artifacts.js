#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const COMMIT_SHA = process.env.COMMIT_SHA || process.env.GITHUB_SHA;
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const CURRENT_RUN_ID = process.env.GITHUB_RUN_ID;

if (!COMMIT_SHA || !REPOSITORY) {
  console.log("COMMIT_SHA or GITHUB_REPOSITORY environment variables are not set. Skipping downloading other artifacts.");
  process.exit(0);
}

const TEMP_DIR = path.resolve(".artifacts/temp");
const TARGET_DIR = path.resolve(".artifacts");

// Create target dirs
const DIRS_MAP = {
  "component-test-allure": "component/allure-results",
  "unit-test-report-core-allure": "core/allure-results",
  "unit-test-report-web-allure": "web/allure-results",
  "unit-test-report-mobile-allure": "mobile/allure-results",
  "e2e-test-allure": "e2e/allure-results",
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const runCommand = (args) => {
  try {
    return execFileSync("gh", args, { stdio: ["ignore", "pipe", "inherit"], timeout: 120000 }).toString().trim(); // NOSONAR
  } catch (error) {
    // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
    console.error(`Command failed: gh ${args.join(" ")}`, error.message);
    return "";
  }
};

const getWorkflowRuns = () => {
  const url = `repos/${REPOSITORY}/actions/runs?head_sha=${COMMIT_SHA}&per_page=100`;
  const responseRaw = runCommand(["api", url]);
  if (!responseRaw) return [];

  try {
    const payload = JSON.parse(responseRaw);
    return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  } catch (error) {
    console.error("Failed to parse workflow runs JSON:", error.message);
    return [];
  }
};

const copyRecursive = (src, dest) => {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { force: true });
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const processDownloadedArtifacts = () => {
  if (!fs.existsSync(TEMP_DIR)) return;

  const entries = fs.readdirSync(TEMP_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const artifactName = entry.name; // e.g., component-test-allure-12345
    // Match prefix
    let matchedKey = null;
    for (const key of Object.keys(DIRS_MAP)) {
      if (artifactName.startsWith(key)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      console.log(`Skipping unknown artifact folder: ${artifactName}`);
      continue;
    }

    const targetSubpath = DIRS_MAP[matchedKey];
    const srcAllureResults = path.join(TEMP_DIR, artifactName, "allure-results");
    
    if (fs.existsSync(srcAllureResults)) {
      const destAllureResults = path.join(TARGET_DIR, targetSubpath);
      console.log(`Moving results from ${srcAllureResults} to ${destAllureResults}`);
      copyRecursive(srcAllureResults, destAllureResults);
    } else {
      // Sometimes the artifact root itself is the results directory or contains it differently
      const srcAlternative = path.join(TEMP_DIR, artifactName);
      // Let's look for any json files directly or in subdirs
      const destAllureResults = path.join(TARGET_DIR, targetSubpath);
      console.log(`Copying files from ${srcAlternative} to ${destAllureResults}`);
      copyRecursive(srcAlternative, destAllureResults);
    }
  }
};

const main = () => {
  console.log(`Searching for other runs on commit ${COMMIT_SHA}...`);
  const runs = getWorkflowRuns();
  
  // Filter runs: we only want successful/completed runs, and not the current run
  const otherRuns = runs.filter(
    (run) =>
      run &&
      String(run.id) !== String(CURRENT_RUN_ID) &&
      run.status === "completed" &&
      (run.conclusion === "success" || run.conclusion === "neutral")
  );

  console.log(`Found ${otherRuns.length} other completed run(s) for this commit.`);
  if (otherRuns.length === 0) {
    return;
  }

  // To prevent downloading duplicate or older runs, sort by run number descending
  const latestRunsMap = new Map();
  for (const run of otherRuns) {
    const existing = latestRunsMap.get(run.workflow_id);
    if (!existing || run.run_number > existing.run_number) {
      latestRunsMap.set(run.workflow_id, run);
    }
  }

  ensureDir(TEMP_DIR);

  for (const run of latestRunsMap.values()) {
    console.log(`Downloading artifacts for workflow '${run.name}' (Run #${run.id}, Run Number ${run.run_number})...`);
    runCommand(["run", "download", String(run.id), "--dir", TEMP_DIR]);
  }

  console.log("Processing downloaded artifacts...");
  processDownloadedArtifacts();

  // Clean up
  console.log("Cleaning up temporary download directory...");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log("Artifacts download and merge completed successfully.");
};

main();
