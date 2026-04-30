#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_LIMIT = 20;

const parseArgs = (argv) => {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Expected value after ${key}`);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
};

const readExistingReports = (filePath) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const jsonForHtml = (value) =>
  JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value || `${DEFAULT_LIMIT}`, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return parsed;
};

const main = () => {
  const args = parseArgs(process.argv);
  const existingPath = args.existing;
  const outputDir = args.output || '.pages-index';
  const templatePath = args.template || '.github/pages/e2e-reports-index.html';
  const limit = parseLimit(args.limit);

  if (!existingPath) {
    throw new Error('--existing is required');
  }

  const generatedAt = new Date().toISOString();
  const report = {
    url: requireEnv('REPORT_URL'),
    path: requireEnv('REPORT_DIR'),
    runId: requireEnv('GITHUB_RUN_ID'),
    runAttempt: requireEnv('GITHUB_RUN_ATTEMPT'),
    prNumber: process.env.PR_NUMBER || null,
    ref: process.env.REF_NAME || process.env.GITHUB_REF_NAME || 'unknown',
    sha: process.env.COMMIT_SHA || process.env.GITHUB_SHA || 'unknown',
    outcome: process.env.E2E_STEP_OUTCOME || 'unknown',
    previewUrl: process.env.BASE_URL || null,
    e2eRef: process.env.E2E_REF || 'master',
    generatedAt,
  };

  const reportsByPath = new Map();
  for (const item of readExistingReports(existingPath)) {
    if (item && typeof item.path === 'string') {
      reportsByPath.set(item.path, item);
    }
  }
  reportsByPath.set(report.path, report);

  const reports = [...reportsByPath.values()]
    .sort((a, b) => {
      const left = Date.parse(a.generatedAt || '') || 0;
      const right = Date.parse(b.generatedAt || '') || 0;
      return right - left;
    })
    .slice(0, limit);

  const reportsDir = path.join(outputDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'index.json'), `${JSON.stringify(reports, null, 2)}\n`);

  const template = fs.readFileSync(templatePath, 'utf8');
  const html = template
    .replace('__REPORTS_JSON__', jsonForHtml(reports))
    .replaceAll('__GENERATED_AT__', generatedAt)
    .replaceAll('__REPORT_LIMIT__', `${limit}`);

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
