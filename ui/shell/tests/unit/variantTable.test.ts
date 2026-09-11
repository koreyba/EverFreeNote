import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { SHELL_VARIANTS, type AppVariant } from '@ui/shell/variants'

/**
 * The build scripts are CommonJS and run before any TypeScript is compiled, so they read
 * variants.data.js directly. This pins the two views of the table together: if they ever
 * diverge, a build produces an APK for the wrong variant, silently.
 */
describe('variant table', () => {
  it('is the same table the build scripts read', () => {
    const scriptDir = path.join(__dirname, '..', '..', 'scripts')
    const fromScript = JSON.parse(
      execFileSync(process.execPath, ['-p', "JSON.stringify(require('../variants.data'))"], {
        cwd: scriptDir,
        encoding: 'utf-8',
      })
    )

    expect(fromScript).toEqual(SHELL_VARIANTS)
  })

  it.each(Object.keys(SHELL_VARIANTS) as AppVariant[])('gives %s a distinct app id and scheme', (variant) => {
    const others = (Object.keys(SHELL_VARIANTS) as AppVariant[]).filter((name) => name !== variant)

    // Colliding ids would make variants overwrite each other on a device.
    expect(others.map((name) => SHELL_VARIANTS[name].appId)).not.toContain(SHELL_VARIANTS[variant].appId)
    expect(others.map((name) => SHELL_VARIANTS[name].scheme)).not.toContain(SHELL_VARIANTS[variant].scheme)
  })
})
