/**
 * Pure transforms over the generated Android project's text files.
 *
 * Separated from add-android.js so they can be tested: these are the pieces that failed
 * quietly once already — a project reused across variants produced an APK for the wrong
 * variant, with nothing in the output to say so.
 */
const INTENT_FILTER_CLOSE = '</intent-filter>'
const PROGUARD_LINE =
  "            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'"

/** The applicationId baked into a generated project, or undefined if absent. */
function readAppId(gradle) {
  return /applicationId\s+"([^"]+)"/.exec(gradle)?.[1]
}

/**
 * The applicationId and the MainActivity package are fixed when the project is
 * generated, and `cap sync` never revisits them, so a project built for another variant
 * has to be discarded rather than reused.
 */
function needsRegeneration(gradle, expectedAppId) {
  const current = readAppId(gradle)
  return current !== undefined && current !== expectedAppId
}

/**
 * Add the OAuth callback intent-filter to MainActivity. Without it the system browser
 * has no way to hand the Supabase redirect back, and sign-in dead-ends on the login
 * screen.
 *
 * The anchor is asserted rather than assumed: a changed Capacitor template should fail
 * loudly here instead of producing an APK that silently cannot receive the callback.
 */
function addOAuthScheme(manifest, scheme) {
  if (manifest.includes(`android:scheme="${scheme}"`)) return { manifest, changed: false }

  const activityAt = manifest.indexOf('MainActivity')
  const closeAt = manifest.indexOf(INTENT_FILTER_CLOSE, activityAt)
  const activityEndAt = manifest.indexOf('</activity>', activityAt)

  if (activityAt === -1 || closeAt === -1 || activityEndAt === -1 || closeAt > activityEndAt) {
    throw new Error(
      "Could not find MainActivity's intent-filter in AndroidManifest.xml; the Capacitor template changed."
    )
  }

  const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" />
            </intent-filter>
`
  const insertAt = closeAt + INTENT_FILTER_CLOSE.length
  return { manifest: manifest.slice(0, insertAt) + intentFilter + manifest.slice(insertAt), changed: true }
}

/**
 * Attach a release signing config. Without one Gradle emits an unsigned APK that cannot
 * be installed, so a template that no longer matches must fail rather than pass through.
 *
 * v1 is enabled alongside v2: AGP drops v1 once minSdk is 24, and some OEM package
 * installers reject a v2-only APK with "problem parsing the package".
 */
function addSigningConfig(gradle) {
  if (gradle.includes('signingConfigs')) return { gradle, changed: false }

  if (!gradle.includes('    buildTypes {') || !gradle.includes(PROGUARD_LINE)) {
    throw new Error('Could not attach the signing config: app/build.gradle does not match the expected template.')
  }

  const signing = `    signingConfigs {
        shellRelease {
            storeFile file(System.getenv("SHELL_KEYSTORE") ?: "shell.keystore")
            storePassword System.getenv("SHELL_KEYSTORE_PASSWORD") ?: "shellshell"
            keyAlias System.getenv("SHELL_KEY_ALIAS") ?: "shell"
            keyPassword System.getenv("SHELL_KEY_PASSWORD") ?: "shellshell"
            enableV1Signing true
            enableV2Signing true
        }
    }
`
  return {
    gradle: gradle
      .replace('    buildTypes {', `${signing}    buildTypes {`)
      .replace(PROGUARD_LINE, `${PROGUARD_LINE}\n            signingConfig signingConfigs.shellRelease`),
    changed: true,
  }
}

/** Which variant and identity a build should use, from the environment. */
function resolveTarget(env, variants) {
  const variant = env.APP_VARIANT in variants ? env.APP_VARIANT : 'dev'
  return {
    variant,
    scheme: (env.SHELL_SCHEME ?? env.NEXT_PUBLIC_SHELL_SCHEME ?? '').trim() || variants[variant].scheme,
    // Mirrors capacitor.config.ts: a per-deployment build overrides the id so it can be
    // installed next to the variant's own build.
    appId: (env.SHELL_APP_ID || '').trim() || variants[variant].appId,
  }
}

module.exports = { readAppId, needsRegeneration, addOAuthScheme, addSigningConfig, resolveTarget }
