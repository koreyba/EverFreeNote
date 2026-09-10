#!/usr/bin/env node
/**
 * Build the Next.js static export and stage it as the shell's web root.
 *
 * The shell ships exactly what the web app ships — the same `npm run build` output —
 * so there is one bundle to reason about and no mobile-specific web build.
 *
 * Env passed through to the web build:
 *   NEXT_PUBLIC_SUPABASE_URL[_STAGE|_PROD] and the matching ANON_KEY - see supabaseEnv.js
 *     for how a variant picks its project; prod must be given its values explicitly.
 *   NEXT_PUBLIC_ENABLE_PERF_HARNESS=true                      - enables /perf-harness/.
 *   APP_VARIANT=dev|stage|prod                                - selects the shell variant.
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const { projectRef, resolveSupabaseEnv } = require('./supabaseEnv')
const VARIANTS = require('../variants.data')

const SHELL_DIR = path.join(__dirname, '..')
const REPO_ROOT = path.join(SHELL_DIR, '..', '..')
const OUT_DIR = path.join(REPO_ROOT, 'out')
const WWW_DIR = path.join(SHELL_DIR, 'www')

// Capacitor serves from https://localhost, so absolute asset paths are correct here.
// (NEXT_PUBLIC_ASSET_PREFIX is only needed for the file:// editor bundle in ui/mobile.)
const variant = process.env.APP_VARIANT in VARIANTS ? process.env.APP_VARIANT : 'dev'

/**
 * Read a variable out of the root env files, in the order Next.js itself prefers.
 * Values are used for reporting, not re-injected — see supabaseEnv.js.
 */
function readFromEnvFiles(name) {
  for (const file of ['.env.local', '.env']) {
    const filePath = path.join(REPO_ROOT, file)
    if (!fs.existsSync(filePath)) continue

    for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
      const match = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`).exec(line)
      if (!match) continue

      const value = match[1].trim().replace(/^(['"])(.*)\1$/, '$2').trim()
      if (value) return value
    }
  }
  return undefined
}

let supabase
try {
  supabase = resolveSupabaseEnv({ variant, env: process.env, readFromEnvFiles })
} catch (error) {
  // A misconfigured variant is a user error, not a crash; a stack trace only hides it.
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

const env = {
  ...process.env,
  NEXT_PUBLIC_ASSET_PREFIX: '',
  // The runtime derives its OAuth scheme from this, so it must match the variant the
  // native project was generated for.
  NEXT_PUBLIC_APP_VARIANT: variant,
  ...supabase.env,
  NEXT_PUBLIC_ENABLE_PERF_HARNESS: process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS || 'false',
}

console.log(`📦 Building Next.js static export (variant: ${variant})...`)
// Printed on every build: a variant pointed at the wrong project is invisible in the APK.
console.log(`   Supabase project: ${projectRef(supabase.url)} (${supabase.source})`)

// Kept in step with publicWebOriginFor() in ui/shell/variants.ts, which cannot be
// required from here: it is TypeScript, and this script runs before compilation.
const publicWebOrigin = (
  process.env[`NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_${variant.toUpperCase()}`] ||
  process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN ||
  readFromEnvFiles(`NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_${variant.toUpperCase()}`) ||
  readFromEnvFiles('NEXT_PUBLIC_PUBLIC_WEB_ORIGIN') ||
  ''
).trim()

if (publicWebOrigin) {
  console.log(`   Share links point at: ${publicWebOrigin}`)
} else {
  console.log(
    `⚠️  NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_${variant.toUpperCase()} is not set — sharing a note will report that instead of producing a link.`
  )
}
if (supabase.usingPlaceholders) {
  console.log('⚠️  No Supabase credentials found — building with placeholders. Sign-in will not work.')
}
execSync('npm run build', { cwd: REPO_ROOT, stdio: 'inherit', env })

if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  throw new Error(`Static export missing: ${path.join(OUT_DIR, 'index.html')}`)
}

console.log('📂 Staging out/ -> ui/shell/www/')
fs.rmSync(WWW_DIR, { recursive: true, force: true })
fs.cpSync(OUT_DIR, WWW_DIR, { recursive: true })

const size = dirSize(WWW_DIR)
console.log(`✅ Web root ready: ${(size / 1024 / 1024).toFixed(2)} MB`)

function dirSize(dir) {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size
  }
  return total
}
