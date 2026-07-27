/* eslint-disable @typescript-eslint/no-require-imports, no-undef */

const fs = require('node:fs')
const path = require('node:path')

const { createCoverageMap } = require('istanbul-lib-coverage')
const libReport = require('istanbul-lib-report')
const reports = require('istanbul-reports')

const projectRoot = process.cwd()
const coverageRoots = ['app/', 'core/', 'ui/web/', 'ui/mobile/']
const excludedPathPatterns = [
  /(^|\/)cypress\//,
  /(^|\/)tests\//,
  /(^|\/)test\//,
  /(^|\/)node_modules\//,
  /\.d\.ts$/,
  /\.config\.(?:js|cjs|mjs|ts)$/,
]

function usage() {
  return 'Usage: node scripts/merge-coverage.cjs --output <lcov-file> <coverage-json>...'
}

function parseArguments(argumentsList) {
  const outputIndex = argumentsList.indexOf('--output')

  if (outputIndex === -1 || !argumentsList[outputIndex + 1]) {
    throw new Error(usage())
  }

  const output = argumentsList[outputIndex + 1]
  const inputs = argumentsList.filter((argument, index) => index !== outputIndex && index !== outputIndex + 1)

  if (inputs.length === 0) {
    throw new Error(usage())
  }

  return { inputs, output }
}

function toProjectRelativePath(filePath) {
  const relativePath = path.relative(projectRoot, path.resolve(filePath))

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Coverage file is outside the project root: ${filePath}`)
  }

  return relativePath.split(path.sep).join('/')
}

function isProductCoveragePath(relativePath) {
  return coverageRoots.some((root) => relativePath.startsWith(root)) &&
    !excludedPathPatterns.some((pattern) => pattern.test(relativePath))
}

function loadCoverageFile(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Coverage input does not exist: ${inputPath}`)
  }

  const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const normalized = {}

  for (const [filePath, fileCoverage] of Object.entries(source)) {
    const relativePath = toProjectRelativePath(filePath)

    if (isProductCoveragePath(relativePath)) {
      normalized[relativePath] = { ...fileCoverage, path: relativePath }
    }
  }

  return normalized
}

function main() {
  const { inputs, output } = parseArguments(process.argv.slice(2))
  const coverageMap = createCoverageMap({})

  for (const input of inputs) {
    coverageMap.merge(loadCoverageFile(input))
  }

  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })

  const context = libReport.createContext({
    coverageMap,
    dir: path.dirname(path.resolve(output)),
  })

  reports.create('lcovonly', {
    file: path.basename(output),
    projectRoot,
  }).execute(context)

  if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
    throw new Error(`Merged LCOV report is empty: ${output}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
