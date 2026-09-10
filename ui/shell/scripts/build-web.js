#!/usr/bin/env node
/**
 * Build the Next.js static export and stage it as the shell's web root.
 *
 * The shell ships exactly what the web app ships — the same `npm run build` output —
 * so there is one bundle to reason about and no mobile-specific web build.
 *
 * Env passed through to the web build:
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  - real values optional;
 *     placeholders are injected when unset so the perf harness can build without secrets.
 *   NEXT_PUBLIC_ENABLE_PERF_HARNESS=true                      - enables /perf-harness/.
 *   APP_VARIANT=dev|stage|prod                                - selects the shell variant.
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SHELL_DIR = path.join(__dirname, '..')
const REPO_ROOT = path.join(SHELL_DIR, '..', '..')
const OUT_DIR = path.join(REPO_ROOT, 'out')
const WWW_DIR = path.join(SHELL_DIR, 'www')

// Capacitor serves from https://localhost, so absolute asset paths are correct here.
// (NEXT_PUBLIC_ASSET_PREFIX is only needed for the file:// editor bundle in ui/mobile.)
const variant = ['dev', 'stage', 'prod'].includes(process.env.APP_VARIANT) ? process.env.APP_VARIANT : 'dev'

/**
 * Next.js loads .env.local itself, but an explicit environment variable beats it — so
 * injecting a placeholder unconditionally would silently override real credentials.
 * Only fill in what neither the environment nor a root env file provides.
 */
function definedInEnvFiles(name) {
  return ['.env.local', '.env'].some((file) => {
    const filePath = path.join(REPO_ROOT, file)
    if (!fs.existsSync(filePath)) return false
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .some((line) => new RegExp(`^\\s*${name}\\s*=\\s*\\S`).test(line))
  })
}

function withFallback(name, fallback) {
  if (process.env[name]) return { [name]: process.env[name] }
  if (definedInEnvFiles(name)) return {}
  return { [name]: fallback }
}

const supabaseEnv = {
  ...withFallback('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co'),
  ...withFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-anon-key'),
}

const usingPlaceholders = 'NEXT_PUBLIC_SUPABASE_URL' in supabaseEnv &&
  supabaseEnv.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'

const env = {
  ...process.env,
  NEXT_PUBLIC_ASSET_PREFIX: '',
  // The runtime derives its OAuth scheme from this, so it must match the variant the
  // native project was generated for.
  NEXT_PUBLIC_APP_VARIANT: variant,
  ...supabaseEnv,
  NEXT_PUBLIC_ENABLE_PERF_HARNESS: process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS || 'false',
}

console.log(`📦 Building Next.js static export (variant: ${variant})...`)
if (usingPlaceholders) {
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
