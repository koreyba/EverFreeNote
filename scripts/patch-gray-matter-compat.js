const fs = require('node:fs')
const path = require('node:path')

// Why this exists:
// ai-devkit@0.47.0 depends on gray-matter@4.0.3. That gray-matter release
// calls js-yaml's safeLoad/safeDump APIs, while this repository's security
// overrides intentionally install modern js-yaml (5.x), where those aliases
// were removed. As a result, `npx ai-devkit@latest lint` used to fail before
// the DevKit could read any docs.
//
// This is a narrow install-time compatibility patch. It preserves modern
// js-yaml for the whole dependency tree and only changes gray-matter's YAML
// engine selection. The fallback is safe because js-yaml's load/dump APIs are
// the replacements for the old safeLoad/safeDump APIs.

const packagePath = require.resolve('gray-matter/package.json')
const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const supportedVersion = '4.0.3'

// Keep this guard: if ai-devkit or gray-matter is upgraded, the patch must be
// reviewed rather than silently modifying an unknown third-party version.
if (packageInfo.version !== supportedVersion) {
  throw new Error(
    `Unsupported gray-matter version ${packageInfo.version}; expected ${supportedVersion}. Review the compatibility patch.`,
  )
}

const enginesPath = path.join(path.dirname(packagePath), 'lib', 'engines.js')
const source = fs.readFileSync(enginesPath, 'utf8')
const patched = source
  .replace('yaml.safeLoad.bind(yaml)', '(yaml.safeLoad || yaml.load).bind(yaml)')
  .replace('yaml.safeDump.bind(yaml)', '(yaml.safeDump || yaml.dump).bind(yaml)')

if (patched !== source) {
  fs.writeFileSync(enginesPath, patched)
  console.log(`Patched gray-matter ${supportedVersion} for modern js-yaml compatibility.`)
}

// Removal condition:
// delete this script and the package.json `postinstall` entry once ai-devkit
// ships a gray-matter/js-yaml combination that no longer references
// safeLoad/safeDump (or once gray-matter itself releases that compatibility
// fix). Verify with `npm ci` followed by `npx ai-devkit@latest lint`.
