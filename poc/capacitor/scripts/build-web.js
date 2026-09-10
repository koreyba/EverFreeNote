#!/usr/bin/env node
/**
 * Build the existing Next.js static export and stage it as the Capacitor web root.
 *
 * Deliberately reuses the untouched root build (`npm run build` -> `out/`), so the
 * POC measures the real production bundle rather than a stripped-down page.
 *
 * Env passed through to the web build:
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  - real values optional;
 *     placeholders are injected when unset so the perf harness can build without secrets.
 *   NEXT_PUBLIC_ENABLE_PERF_HARNESS=true                      - enables /perf-harness/.
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const POC_DIR = path.join(__dirname, '..')
const REPO_ROOT = path.join(POC_DIR, '..', '..')
const OUT_DIR = path.join(REPO_ROOT, 'out')
const WWW_DIR = path.join(POC_DIR, 'www')

// Capacitor serves from https://localhost, so absolute asset paths are correct here.
// (NEXT_PUBLIC_ASSET_PREFIX is only needed for the file:// editor bundle in ui/mobile.)
const env = {
  ...process.env,
  NEXT_PUBLIC_ASSET_PREFIX: '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  NEXT_PUBLIC_ENABLE_PERF_HARNESS: process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS || 'true',
}

console.log('📦 Building Next.js static export...')
execSync('npm run build', { cwd: REPO_ROOT, stdio: 'inherit', env })

if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  throw new Error(`Static export missing: ${path.join(OUT_DIR, 'index.html')}`)
}

console.log('📂 Staging out/ -> poc/capacitor/www/')
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
