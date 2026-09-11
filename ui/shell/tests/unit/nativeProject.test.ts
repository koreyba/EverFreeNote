import {
  addOAuthScheme,
  addSigningConfig,
  needsRegeneration,
  readAppId,
  resolveTarget,
} from '@ui/shell/scripts/nativeProject'

const VARIANTS = {
  dev: { appId: 'com.everfreenote.shell.dev', scheme: 'everfreenote-dev' },
  stage: { appId: 'com.everfreenote.shell.stage', scheme: 'everfreenote-stage' },
}

/** The shape Capacitor generates, trimmed to what the patches anchor on. */
const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <provider android:name="androidx.core.content.FileProvider" />
    </application>
</manifest>`

const GRADLE = `android {
    namespace = "com.everfreenote.shell.stage"
    defaultConfig {
        applicationId "com.everfreenote.shell.stage"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}`

describe('readAppId', () => {
  it('reads the id a project was generated for', () => {
    expect(readAppId(GRADLE)).toBe('com.everfreenote.shell.stage')
  })

  it('returns undefined when there is none', () => {
    expect(readAppId('android { }')).toBeUndefined()
  })
})

describe('needsRegeneration', () => {
  it('regenerates when the project belongs to another variant', () => {
    // The failure this prevents: building "dev" and getting a stage APK, silently.
    expect(needsRegeneration(GRADLE, 'com.everfreenote.shell.dev')).toBe(true)
  })

  it('keeps a project that already matches', () => {
    expect(needsRegeneration(GRADLE, 'com.everfreenote.shell.stage')).toBe(false)
  })

  it('keeps a project whose id cannot be read, rather than discarding blindly', () => {
    expect(needsRegeneration('android { }', 'com.everfreenote.shell.dev')).toBe(false)
  })
})

describe('addOAuthScheme', () => {
  it('adds the intent-filter inside MainActivity', () => {
    const { manifest, changed } = addOAuthScheme(MANIFEST, 'everfreenote-stage')

    expect(changed).toBe(true)
    expect(manifest).toContain('<data android:scheme="everfreenote-stage" />')

    // It must land inside the activity, or Android never routes the callback to us.
    const schemeAt = manifest.indexOf('android:scheme="everfreenote-stage"')
    expect(schemeAt).toBeGreaterThan(manifest.indexOf('.MainActivity'))
    expect(schemeAt).toBeLessThan(manifest.indexOf('</activity>'))
  })

  it('is idempotent, so repeated builds do not stack filters', () => {
    const once = addOAuthScheme(MANIFEST, 'everfreenote-stage').manifest
    const twice = addOAuthScheme(once, 'everfreenote-stage')

    expect(twice.changed).toBe(false)
    expect(twice.manifest).toBe(once)
  })

  it('fails loudly when the template no longer has an anchor', () => {
    // Better than an APK that cannot receive the OAuth callback and says nothing.
    expect(() => addOAuthScheme('<manifest><application /></manifest>', 'x')).toThrow(/Capacitor template changed/)
  })
})

describe('addSigningConfig', () => {
  it('adds a signing config and points release at it', () => {
    const { gradle, changed } = addSigningConfig(GRADLE)

    expect(changed).toBe(true)
    expect(gradle).toContain('signingConfigs {')
    expect(gradle).toContain('signingConfig signingConfigs.shellRelease')
    // v1 alongside v2: AGP drops v1 at minSdk 24 and some installers then refuse the APK.
    expect(gradle).toContain('enableV1Signing true')
    expect(gradle.indexOf('signingConfigs {')).toBeLessThan(gradle.indexOf('buildTypes {'))
  })

  it('is idempotent', () => {
    const once = addSigningConfig(GRADLE).gradle
    expect(addSigningConfig(once)).toEqual({ gradle: once, changed: false })
  })

  it('fails rather than emit an unsigned release APK', () => {
    expect(() => addSigningConfig('android { buildTypes { release { } } }')).toThrow(/does not match the expected/)
  })
})

describe('resolveTarget', () => {
  it('falls back to dev for an unknown variant', () => {
    expect(resolveTarget({ APP_VARIANT: 'nope' }, VARIANTS)).toEqual({
      variant: 'dev',
      scheme: 'everfreenote-dev',
      appId: 'com.everfreenote.shell.dev',
    })
  })

  it('takes the variant from the environment', () => {
    expect(resolveTarget({ APP_VARIANT: 'stage' }, VARIANTS).appId).toBe('com.everfreenote.shell.stage')
  })

  it('lets a per-deployment build override the id while keeping the registered scheme', () => {
    const target = resolveTarget(
      { APP_VARIANT: 'stage', SHELL_APP_ID: 'com.everfreenote.shell.branch.x' },
      VARIANTS
    )

    expect(target.appId).toBe('com.everfreenote.shell.branch.x')
    // The scheme stays the variant's, because that is what Supabase has registered.
    expect(target.scheme).toBe('everfreenote-stage')
  })

  it.each(['SHELL_SCHEME', 'NEXT_PUBLIC_SHELL_SCHEME'])('lets %s override the scheme', (name) => {
    expect(resolveTarget({ APP_VARIANT: 'stage', [name]: 'efn-custom' }, VARIANTS).scheme).toBe('efn-custom')
  })
})
