#!/usr/bin/env node
/**
 * Regenerate the committed launcher icon resources from assets/icon.png.
 *
 * Run this on a developer machine when the artwork changes, then commit the result.
 * It is deliberately not part of the build: @capacitor/assets pulls in sharp, a native
 * module whose binaries arrive through install scripts, and CI installs with
 * --ignore-scripts — so a build that generated icons would fail there.
 *
 * Only the launcher icon is kept. The generator also emits a splash screen for every
 * density and orientation, which added 4.4 MB to the repo and 3 MB to every APK; the
 * stock Capacitor splash is used instead.
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const { localBin } = require('./localBin')

const SHELL_DIR = path.join(__dirname, '..')
const ANDROID_DIR = path.join(SHELL_DIR, 'android')
const RES_DIR = path.join(ANDROID_DIR, 'app', 'src', 'main', 'res')
const DEST = path.join(SHELL_DIR, 'assets', 'android-res')

if (!fs.existsSync(ANDROID_DIR)) {
  console.error('\n❌ android/ does not exist yet. Run a build first, then this.\n')
  process.exit(1)
}

console.log('🎨 Generating icons with @capacitor/assets')
execFileSync(localBin('capacitor-assets'), ['generate', '--android', '--assetPath', 'assets'], {
  cwd: SHELL_DIR,
  stdio: 'inherit',
})

fs.rmSync(DEST, { recursive: true, force: true })

let copied = 0
for (const entry of walk(RES_DIR)) {
  const relative = path.relative(RES_DIR, entry)
  if (!relative.includes('mipmap') && !path.basename(entry).startsWith('ic_launcher')) continue

  const target = path.join(DEST, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(entry, target)
  copied += 1
}

console.log(`\n✅ ${copied} icon files written to assets/android-res — commit them.`)

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}
