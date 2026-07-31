/* global console, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const expectedNativeVersion = '7.0.2'
const expectedTsApiVersion = '6.0.3'

// 1. Verify @typescript/native (TypeScript 7 native compiler package)
const nativeVersion = require('@typescript/native/package.json').version
if (nativeVersion !== expectedNativeVersion) {
  throw new Error(`@typescript/native reported ${nativeVersion}; expected ${expectedNativeVersion}`)
}
console.log(`tsc: Version ${nativeVersion}`)

// 2. Verify typescript API (TypeScript 6 compatibility library for ESLint/Next)
const tsApiVersion = require('typescript').version
if (tsApiVersion !== expectedTsApiVersion) {
  throw new Error(`typescript API reported ${tsApiVersion}; expected ${expectedTsApiVersion}`)
}
console.log(`typescript API: ${tsApiVersion}`)


