#!/usr/bin/env node
/**
 * Create (or repair) the native Android project for the selected shell variant.
 *
 * `npx cap add android` generates a stock project; on top of that this script wires
 * the OAuth callback: without an intent-filter for the variant's custom scheme, the
 * system browser has no way to hand the Supabase redirect back to the app, and the
 * user is left staring at the login screen after a successful Google sign-in.
 *
 *   APP_VARIANT=stage node scripts/add-android.js
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SHELL_DIR = path.join(__dirname, '..')
const ANDROID_DIR = path.join(SHELL_DIR, 'android')
const MANIFEST = path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml')

const variant = ['dev', 'stage', 'prod'].includes(process.env.APP_VARIANT) ? process.env.APP_VARIANT : 'dev'
// Kept in sync with ui/shell/variants.ts (this script runs before TS compilation).
const scheme =
  (process.env.SHELL_SCHEME ?? process.env.NEXT_PUBLIC_SHELL_SCHEME ?? '').trim() ||
  { dev: 'everfreenote-dev', stage: 'everfreenote-stage', prod: 'everfreenote' }[variant]

if (!fs.existsSync(ANDROID_DIR)) {
  console.log(`📱 Generating android project (variant: ${variant})`)
  execSync('npx cap add android', { cwd: SHELL_DIR, stdio: 'inherit' })
} else {
  console.log('📱 android/ already exists — patching manifest only')
}

const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (sdkDir) {
  fs.writeFileSync(path.join(ANDROID_DIR, 'local.properties'), `sdk.dir=${sdkDir}\n`)
}

let manifest = fs.readFileSync(MANIFEST, 'utf-8')

if (manifest.includes(`android:scheme="${scheme}"`)) {
  console.log(`✅ manifest already declares ${scheme}://`)
} else {
  const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" />
            </intent-filter>
`
  // Append inside the MainActivity element, after the launcher intent-filter.
  const anchor = '</intent-filter>'
  const index = manifest.indexOf(anchor)
  if (index === -1) throw new Error('Could not find an intent-filter to anchor to in AndroidManifest.xml')
  const insertAt = index + anchor.length
  manifest = manifest.slice(0, insertAt) + intentFilter + manifest.slice(insertAt)
  fs.writeFileSync(MANIFEST, manifest)
  console.log(`✅ added intent-filter for ${scheme}://`)
}

// Release builds need a signing config; without one Gradle produces an unsigned APK
// that cannot be installed. POC_KEYSTORE points at whatever key the build should use.
const APP_GRADLE = path.join(ANDROID_DIR, 'app', 'build.gradle')
let gradle = fs.readFileSync(APP_GRADLE, 'utf-8')

if (gradle.includes('signingConfigs')) {
  console.log('✅ build.gradle already has a signing config')
} else {
  const signing = `    signingConfigs {
        shellRelease {
            storeFile file(System.getenv("SHELL_KEYSTORE") ?: "shell.keystore")
            storePassword System.getenv("SHELL_KEYSTORE_PASSWORD") ?: "shellshell"
            keyAlias System.getenv("SHELL_KEY_ALIAS") ?: "shell"
            keyPassword System.getenv("SHELL_KEY_PASSWORD") ?: "shellshell"
        }
    }
`
  gradle = gradle.replace('    buildTypes {', `${signing}    buildTypes {`)
  gradle = gradle.replace(
    "            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'",
    "            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n            signingConfig signingConfigs.shellRelease"
  )
  fs.writeFileSync(APP_GRADLE, gradle)
  console.log('✅ added release signing config')
}

console.log(`
Redirect URL this build expects in Supabase Auth -> URL Configuration:
  ${scheme}://auth/callback
`)
