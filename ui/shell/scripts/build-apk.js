#!/usr/bin/env node
/**
 * Build an installable APK, end to end: web build, native project, sync, Gradle.
 *
 * Normally invoked through the android:* scripts in package.json rather than directly.
 * Node rather than shell so it runs on Windows too, the way ui/mobile's build does.
 *
 *   APP_VARIANT=stage node scripts/build-apk.js [debug|release]
 */
const { execFileSync, execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const buildType = process.argv[2] ?? 'release'
const variant = process.env.APP_VARIANT ?? 'dev'
const SHELL_DIR = path.join(__dirname, '..')
const ANDROID_DIR = path.join(SHELL_DIR, 'android')

if (!['debug', 'release'].includes(buildType)) {
  fail(`Unknown build type "${buildType}". Use debug or release.`)
}

if (!process.env.JAVA_HOME) {
  fail("JAVA_HOME is not set. Capacitor 8 needs JDK 21 — 17 fails with 'invalid source release: 21'.")
}

if (buildType === 'release' && !process.env.SHELL_KEYSTORE) {
  fail(
    'SHELL_KEYSTORE is not set; a release APK would be signed with a key that does not exist ' +
      'and could not be installed.\nEither point it at a keystore, or build a debug APK.'
  )
}

run('node', [path.join(__dirname, 'build-web.js')])
run('node', [path.join(__dirname, 'add-android.js')])
run(npmCommand('npx'), ['cap', 'sync', 'android'])

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const task = buildType === 'release' ? 'assembleRelease' : 'assembleDebug'
execSync(`${gradlew} ${task}`, { cwd: ANDROID_DIR, stdio: 'inherit' })

const apk = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`)
if (!fs.existsSync(apk)) fail(`Gradle finished but ${apk} is missing.`)

console.log(`\n✅ ${variant} ${buildType} APK: ${apk}`)
console.log(`   install with: adb install -r ${apk}`)

function run(command, args) {
  execFileSync(command, args, { cwd: SHELL_DIR, stdio: 'inherit' })
}

function npmCommand(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name
}

function fail(message) {
  console.error(`\n❌ ${message}\n`)
  process.exit(1)
}
