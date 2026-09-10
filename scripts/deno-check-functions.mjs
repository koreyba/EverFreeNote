#!/usr/bin/env node
// Type-checks every Supabase Edge Function with its own deno.json (import map).
// A single `deno check supabase/functions/**/*.ts` cannot do this: it ignores
// the per-function import maps, so @core/, npm: and esm.sh specifiers fail.
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { delimiter, isAbsolute, join } from 'node:path'

const FUNCTIONS_DIR = join(process.cwd(), 'supabase', 'functions')
const DENO_BINARY = process.platform === 'win32' ? 'deno.exe' : 'deno'
const only = process.argv.slice(2)

function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * Absolute path of the Deno binary.
 *
 * Spawning the bare name `deno` would let any directory on PATH decide which
 * binary runs, including a relative entry that resolves against the current
 * working directory. The lookup therefore happens here, only absolute PATH
 * entries are considered, and only an absolute path is ever executed.
 */
function resolveDenoBinary() {
  const configured = process.env.DENO_BIN?.trim()
  if (configured) {
    if (!isAbsolute(configured) || !isFile(configured)) {
      throw new Error(`DENO_BIN must be an absolute path to the Deno binary, got: ${configured}`)
    }
    return configured
  }

  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir || !isAbsolute(dir)) continue
    const candidate = join(dir, DENO_BINARY)
    if (isFile(candidate)) return candidate
  }

  throw new Error(
    'Deno was not found on PATH. Install Deno, or set DENO_BIN to the absolute path of the binary\n' +
      '(running `npx --yes deno@2 --version` once caches one under ~/.npm/_npx).',
  )
}

/** Directories that contain an index.ts, with a note of whether they also ship a deno.json. */
function collectFunctions() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const files = readdirSync(join(FUNCTIONS_DIR, entry.name))
      return { name: entry.name, hasEntrypoint: files.includes('index.ts'), hasConfig: files.includes('deno.json') }
    })
    .filter((fn) => fn.hasEntrypoint && (only.length === 0 || only.includes(fn.name)))
}

const deno = resolveDenoBinary()
const functions = collectFunctions()
let failed = 0

for (const fn of functions) {
  const dir = join(FUNCTIONS_DIR, fn.name)
  const args = ['check', ...(fn.hasConfig ? ['--config', join(dir, 'deno.json')] : []), join(dir, 'index.ts')]
  console.log(`\n▶ deno ${args.join(' ')}`)
  if (spawnSync(deno, args, { stdio: 'inherit' }).status !== 0) {
    failed += 1
    console.error(`✖ ${fn.name} failed`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} function(s) failed deno check`)
  process.exit(1)
}
console.log(`\n✓ ${functions.length} function(s) passed deno check`)
