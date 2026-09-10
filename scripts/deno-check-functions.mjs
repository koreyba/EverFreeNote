#!/usr/bin/env node
// Type-checks every Supabase Edge Function with its own deno.json (import map).
// A single `deno check supabase/functions/**/*.ts` cannot do this: it ignores
// the per-function import maps, so @core/, npm: and esm.sh specifiers fail.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const FUNCTIONS_DIR = join(process.cwd(), 'supabase', 'functions')
const only = process.argv.slice(2)

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

const functions = collectFunctions()
let failed = 0

for (const fn of functions) {
  const dir = join(FUNCTIONS_DIR, fn.name)
  const args = ['check', ...(fn.hasConfig ? ['--config', join(dir, 'deno.json')] : []), join(dir, 'index.ts')]
  console.log(`\n▶ deno ${args.join(' ')}`)
  if (spawnSync('deno', args, { stdio: 'inherit' }).status !== 0) {
    failed += 1
    console.error(`✖ ${fn.name} failed`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} function(s) failed deno check`)
  process.exit(1)
}
console.log(`\n✓ ${functions.length} function(s) passed deno check`)
