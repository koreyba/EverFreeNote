/**
 * Resolve a CLI to the copy installed in this package.
 *
 * Not `npx`: it resolves through PATH and will fetch and run a package on demand if the
 * name is not installed, which is a supply-chain hazard in a build. Not a bare command
 * name either, for the same PATH reason.
 */
const fs = require('node:fs')
const path = require('node:path')

const BIN_DIR = path.join(__dirname, '..', 'node_modules', '.bin')

function localBin(name) {
  const binary = path.join(BIN_DIR, process.platform === 'win32' ? `${name}.cmd` : name)
  if (!fs.existsSync(binary)) {
    throw new Error(`${name} is not installed in ui/shell. Run: npm --prefix ui/shell ci`)
  }
  return binary
}

/** The npm that invoked us, by absolute path, falling back to a PATH lookup. */
function npmCommand() {
  const execpath = process.env.npm_execpath
  return execpath ? { command: process.execPath, prefixArgs: [execpath] } : { command: 'npm', prefixArgs: [] }
}

module.exports = { localBin, npmCommand }
