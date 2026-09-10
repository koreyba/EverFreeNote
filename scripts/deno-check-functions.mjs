#!/usr/bin/env node
// Type-checks every Supabase Edge Function with its own deno.json (import map),
// which a single `deno check supabase/functions/**/*.ts` cannot do.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const functionsDir = join(process.cwd(), 'supabase', 'functions')
const only = process.argv.slice(2)
const names = readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(functionsDir, entry.name, 'index.ts')))
  .map((entry) => entry.name)
  .filter((name) => only.length === 0 || only.includes(name))

let failed = 0
for (const name of names) {
  const dir = join(functionsDir, name)
  const config = join(dir, 'deno.json')
  const args = ['check', ...(existsSync(config) ? ['--config', config] : []), join(dir, 'index.ts')]
  console.log(`\n▶ deno ${args.join(' ')}`)
  const result = spawnSync('deno', args, { stdio: 'inherit' })
  if (result.status !== 0) {
    failed += 1
    console.error(`✖ ${name} failed`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} function(s) failed deno check`)
  process.exit(1)
}
console.log(`\n✓ ${names.length} function(s) passed deno check`)
