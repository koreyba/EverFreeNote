#!/usr/bin/env node
/**
 * Create (or repair) the native Android project for the selected shell variant.
 *
 * `cap add android` generates a stock project; on top of that this script wires
 * the OAuth callback: without an intent-filter for the variant's custom scheme, the
 * system browser has no way to hand the Supabase redirect back to the app, and the
 * user is left staring at the login screen after a successful Google sign-in.
 *
 *   APP_VARIANT=stage node scripts/add-android.js
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const VARIANTS = require('../variants.data')
const { addOAuthScheme, addSigningConfig, needsRegeneration, resolveTarget } = require('./nativeProject')
const { localBin } = require('./localBin')

const SHELL_DIR = path.join(__dirname, '..')
const ANDROID_DIR = path.join(SHELL_DIR, 'android')
const MANIFEST = path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml')

const { variant, scheme, appId: expectedAppId } = resolveTarget(process.env, VARIANTS)

const GRADLE_PATH = path.join(ANDROID_DIR, 'app', 'build.gradle')

// android/ is a working directory: a project generated for another variant is discarded
// rather than reused, because reusing it produces an APK for that other variant silently.
if (fs.existsSync(GRADLE_PATH) && needsRegeneration(fs.readFileSync(GRADLE_PATH, 'utf-8'), expectedAppId)) {
  console.log(`♻️  android/ was generated for another variant; regenerating for ${expectedAppId}`)
  fs.rmSync(ANDROID_DIR, { recursive: true, force: true })
}

if (!fs.existsSync(ANDROID_DIR)) {
  console.log(`📱 Generating android project (variant: ${variant})`)
  execFileSync(localBin('cap'), ['add', 'android'], { cwd: SHELL_DIR, stdio: 'inherit' })
} else {
  console.log(`📱 android/ already matches ${expectedAppId} — patching only`)
}

const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (sdkDir) {
  fs.writeFileSync(path.join(ANDROID_DIR, 'local.properties'), `sdk.dir=${sdkDir}\n`)
}

const manifest = addOAuthScheme(fs.readFileSync(MANIFEST, 'utf-8'), scheme)
if (manifest.changed) {
  fs.writeFileSync(MANIFEST, manifest.manifest)
  console.log(`✅ added intent-filter for ${scheme}://`)
} else {
  console.log(`✅ manifest already declares ${scheme}://`)
}

const gradle = addSigningConfig(fs.readFileSync(GRADLE_PATH, 'utf-8'))
if (gradle.changed) {
  fs.writeFileSync(GRADLE_PATH, gradle.gradle)
  console.log('✅ added release signing config')
} else {
  console.log('✅ build.gradle already has a signing config')
}

// Launcher icon, copied over the generated project every time because android/ is a
// working directory and would otherwise fall back to the stock Capacitor icon.
//
// Copied rather than generated: @capacitor/assets pulls in sharp, a native module whose
// binaries need install scripts, and CI installs with --ignore-scripts. Regenerate with
// `npm run assets:generate` when the artwork changes — that is a developer's machine,
// where install scripts do run.
const ICON_SOURCE = path.join(SHELL_DIR, 'assets', 'android-res')
const RES_DIR = path.join(ANDROID_DIR, 'app', 'src', 'main', 'res')

if (!fs.existsSync(ICON_SOURCE)) {
  throw new Error(`Launcher icon resources are missing: ${ICON_SOURCE}. Run npm run assets:generate.`)
}

console.log('🎨 Applying launcher icon')
fs.cpSync(ICON_SOURCE, RES_DIR, { recursive: true })

console.log(`
Redirect URL this build expects in Supabase Auth -> URL Configuration:
  ${scheme}://auth/callback
`)
