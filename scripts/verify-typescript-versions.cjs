/* global console, process, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const { execFileSync } = require('node:child_process')
const path = require('node:path')

const expectedVersions = {
  tsc: 'Version 7.0.2',
  tsc6: 'Version 6.0.3',
}

for (const [command, expected] of Object.entries(expectedVersions)) {
  const suffix = process.platform === 'win32' ? '.cmd' : ''
  const executable = path.join(process.cwd(), 'node_modules', '.bin', `${command}${suffix}`)
  const output = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', executable, '--version'], { encoding: 'utf8' }).trim()
    : execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim()
  if (output !== expected) {
    throw new Error(`${command} reported ${output}; expected ${expected}`)
  }
  console.log(`${command}: ${output}`)
}
