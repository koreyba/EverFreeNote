#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./allure-pages-utils");

const SPEC_PATTERN = /^cypress\/component\/.+\.cy\.(?:js|jsx|ts|tsx)$/;
const compareNames = (a, b) => (a < b ? -1 : Number(a > b));
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function writeJson(file, value) {
  if (typeof file !== "string") throw new Error("An --output file is required");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function discoverSpecs() {
  const specs = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Symlink in component specs: ${file}`);
      if (entry.isDirectory()) visit(file);
      else if (SPEC_PATTERN.test(file)) specs.push(file);
    }
  }
  visit("cypress/component");
  if (!specs.length) throw new Error("No component specs found");
  for (const spec of specs) {
    if (/[,\r\n]/.test(spec)) throw new Error(`Spec path cannot be passed to Cypress --spec: ${spec}`);
  }
  return specs.sort(compareNames);
}

function validateSha(sha) {
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/i.test(sha)) {
    throw new Error("A full 40-character --sha is required");
  }
}

function loadDurations(file) {
  const durations = file ? readJson(file).durationMs : {};
  if (!durations || typeof durations !== "object" || Array.isArray(durations)) {
    throw new Error("Invalid duration map");
  }
  const values = Object.values(durations);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Every measured duration must be a positive number");
  }
  values.sort((a, b) => a - b);
  const fallback = values.length ? values[Math.floor(values.length / 2)] : 5000;
  return (spec) => durations[spec] ?? fallback;
}

function createPlan(args) {
  validateSha(args.sha);
  const count = Number(args.shards ?? 4);
  if (!Number.isInteger(count) || count < 1 || count > 16) {
    throw new Error("Shard count must be an integer from 1 to 16");
  }
  const specs = discoverSpecs();
  const defaultWeights = "cypress/component-timings.json";
  const weight = loadDurations(args.weights ?? (fs.existsSync(defaultWeights) ? defaultWeights : null));
  const shards = Array.from({ length: Math.min(count, specs.length) }, (_, index) => ({
    index: index + 1, specs: [], estimatedMs: 0,
  }));
  const ordered = [...specs].sort((a, b) => weight(b) - weight(a) || compareNames(a, b));
  for (const spec of ordered) {
    const target = shards.reduce((best, shard) => shard.estimatedMs < best.estimatedMs ? shard : best);
    target.specs.push(spec);
    target.estimatedMs += weight(spec);
  }
  for (const shard of shards) shard.specs.sort(compareNames);
  return { version: 1, sha: args.sha, specs, shards,
    matrix: { include: shards.map((shard) => ({ shard: shard.index })) } };
}

function readPlan(file) {
  const plan = readJson(file);
  validateSha(plan.sha);
  if (plan.version !== 1 || !Array.isArray(plan.specs) || !Array.isArray(plan.shards)) {
    throw new Error("Invalid component shard plan");
  }
  if (JSON.stringify(discoverSpecs()) !== JSON.stringify(plan.specs)) {
    throw new Error("Component spec discovery changed; regenerate the shard plan");
  }
  const selected = plan.shards.flatMap((shard) => shard.specs);
  if (plan.shards.some((shard, index) => shard.index !== index + 1 || !shard.specs?.length) ||
      new Set(selected).size !== selected.length ||
      JSON.stringify([...selected].sort(compareNames)) !== JSON.stringify(plan.specs)) {
    throw new Error("Every component spec must appear in exactly one nonempty shard");
  }
  return plan;
}

function selectShard(args) {
  const plan = readPlan(args.plan);
  const selected = plan.shards.find((shard) => shard.index === Number(args.shard));
  if (!selected) throw new Error("Unknown component shard index");
  const attempt = Number(args.attempt ?? 1);
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("Invalid workflow attempt");
  writeJson(args.output, { version: plan.version, sha: plan.sha, attempt, ...selected });
  return selected.specs.join(",");
}

function copyTree(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Symlink in shard evidence: ${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source).sort(compareNames)) {
      copyTree(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) {
    if (!fs.readFileSync(source).equals(fs.readFileSync(destination))) {
      throw new Error(`Conflicting shard evidence file: ${destination}`);
    }
  } else {
    fs.copyFileSync(source, destination);
  }
}

function copyShardEvidence(folder, output, index) {
  const source = path.join(folder, "allure-results/component");
  const destination = path.join(output, "allure-results/component");
  const diagnostics = path.join(output, "cypress/results", `shard-${index}`);
  for (const name of fs.readdirSync(source).sort(compareNames)) {
    if (["environment.properties", "executor.json"].includes(name)) {
      // Runner kernel/executor details may differ. Retain each original and use
      // the first global metadata file for the combined Allure environment.
      copyTree(path.join(source, name), path.join(diagnostics, "allure-metadata", name));
      if (fs.existsSync(path.join(destination, name))) continue;
    }
    copyTree(path.join(source, name), path.join(destination, name));
  }
  for (const kind of ["results", "screenshots", "videos"]) {
    const input = path.join(folder, "cypress", kind);
    if (fs.existsSync(input)) copyTree(input, path.join(output, "cypress", kind, `shard-${index}`));
  }
  return source;
}

function observedSpecs(directory) {
  const observed = new Set();
  for (const file of fs.readdirSync(directory)) {
    if (!file.endsWith("-result.json")) continue;
    const result = readJson(path.join(directory, file));
    if (typeof result.fullName !== "string") throw new Error(`Missing Allure fullName: ${file}`);
    const match = result.fullName.match(/(?:^|:)(cypress\/component\/[^#]+\.cy\.(?:js|jsx|ts|tsx))#/);
    if (match) observed.add(match[1]);
  }
  return observed;
}

function checkObservedSpecs(expected, observed) {
  const errors = [];
  for (const spec of observed) {
    if (!expected.includes(spec)) errors.push(`Unexpected observed spec: ${spec}`);
  }
  for (const spec of expected) {
    if (!observed.has(spec)) errors.push(`Missing observed spec: ${spec}`);
  }
  return errors;
}

function mergeCoverage(folder, coverageMap) {
  const file = path.join(folder, ".nyc_output/out.json");
  if (!fs.existsSync(file)) throw new Error(`Missing shard coverage: ${file}`);
  const coverage = readJson(file);
  if (!Object.keys(coverage).length) throw new Error("Empty shard coverage");
  for (const entry of Object.values(coverage)) {
    const relative = path.relative(process.cwd(), path.resolve(entry.path));
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
      throw new Error("Coverage source is outside this checkout");
    }
  }
  coverageMap.merge(coverage);
}

function validateShardMetadata(metadata, plan, seen) {
  const selected = plan.shards.find((shard) => shard.index === metadata.index);
  if (!selected) throw new Error("Unexpected shard index");
  if (seen.has(metadata.index)) throw new Error(`Duplicate shard ${metadata.index}`);
  seen.add(metadata.index);
  if (metadata.version !== plan.version || metadata.sha !== plan.sha) {
    throw new Error(`Shard ${metadata.index} SHA/version does not match this run`);
  }
  if (JSON.stringify(metadata.specs) !== JSON.stringify(selected.specs)) {
    throw new Error(`Shard ${metadata.index} spec selection does not match the plan`);
  }
  return selected;
}

function latestArtifacts(input, errors) {
  const latest = new Map();
  const identities = new Set();
  const folders = fs.existsSync(input) ? fs.readdirSync(input).sort(compareNames) : [];
  for (const name of folders) {
    try {
      const folder = path.join(input, name);
      const metadata = readJson(path.join(folder, "component-shard.json"));
      const attempt = metadata.attempt ?? 1;
      if (!Number.isInteger(metadata.index) || !Number.isInteger(attempt) || attempt < 1) {
        throw new Error("Invalid shard index or workflow attempt");
      }
      const identity = `${metadata.index}:${attempt}`;
      if (identities.has(identity)) throw new Error(`Duplicate shard ${identity}`);
      identities.add(identity);
      const previous = latest.get(metadata.index);
      if (!previous || attempt > previous.attempt) latest.set(metadata.index, { name, folder, metadata, attempt });
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  return [...latest.values()].sort((a, b) => a.metadata.index - b.metadata.index);
}

function mergeArtifacts(args) {
  const plan = readPlan(args.plan);
  if (args.sha !== plan.sha) throw new Error("Plan SHA does not match the current run");
  if (![undefined, "true", "false"].includes(args.coverage)) throw new Error("Invalid --coverage value");
  if (fs.existsSync(args.output) && fs.readdirSync(args.output).length) {
    throw new Error("The merge output directory must be empty to prevent stale evidence");
  }
  const { createCoverageMap } = require("istanbul-lib-coverage");
  const coverageMap = createCoverageMap({});
  const observed = new Set();
  const seen = new Set();
  const summary = { sha: plan.sha, expectedSpecs: plan.specs.length, observedSpecs: 0,
    coverageInputs: 0, shards: [], errors: [] };
  // Per-attempt artifacts remain immutable. A rerun of one shard reuses the
  // unchanged successful shards, but never sums the old and new attempts.
  for (const { name, folder, metadata, attempt } of latestArtifacts(args.input, summary.errors)) {
    try {
      const shard = validateShardMetadata(metadata, plan, seen);
      const results = copyShardEvidence(folder, args.output, shard.index);
      const specs = observedSpecs(results);
      summary.errors.push(...checkObservedSpecs(shard.specs, specs));
      for (const spec of specs) observed.add(spec);
      summary.shards.push({ index: shard.index, attempt, artifact: name, observedSpecs: specs.size });
      if (args.coverage === "true") {
        mergeCoverage(folder, coverageMap);
        summary.coverageInputs += 1;
      }
    } catch (error) {
      summary.errors.push(`${name}: ${error.message}`);
    }
  }
  for (const shard of plan.shards) {
    if (!seen.has(shard.index)) summary.errors.push(`Missing shard ${shard.index}`);
  }
  summary.observedSpecs = observed.size;
  if (args.coverage === "true" && summary.coverageInputs) {
    writeJson(path.join(args.output, ".nyc_output/out.json"), coverageMap.toJSON());
  }
  writeJson(path.join(args.output, "summary.json"), summary);
  return summary;
}

function main() {
  const command = process.argv[2];
  const args = parseArgs([process.argv[0], process.argv[1], ...process.argv.slice(3)]);
  if (command === "plan") {
    const plan = createPlan(args);
    writeJson(args.output, plan);
    console.log(JSON.stringify(plan));
  } else if (command === "select") {
    console.log(selectShard(args));
  } else if (command === "merge") {
    const summary = mergeArtifacts(args);
    console.log(JSON.stringify(summary));
    if (summary.errors.length) throw new Error(summary.errors.join("\n"));
  } else {
    throw new Error("Usage: component-shards.js plan|select|merge [options]");
  }
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { discoverSpecs, createPlan, readPlan };
