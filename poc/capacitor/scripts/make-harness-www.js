#!/usr/bin/env node
/**
 * Turn the staged web root into a perf-harness build: the shell boots straight
 * into /perf-harness/ instead of the app's auth screen.
 * Run after scripts/build-web.js, then `npx cap sync android`.
 */
const fs = require('node:fs')
const path = require('node:path')

const WWW = path.join(__dirname, '..', 'www')
const notes = process.env.PERF_NOTES || '1000'

fs.writeFileSync(
  path.join(WWW, 'index.html'),
  // NOTE: the target must be the explicit index.html path. Capacitor's Android
  // local server resolves directory paths ("/perf-harness/") to the ROOT index.html
  // instead of the route's own file — see docs/ai/analysis for the implication.
  `<!doctype html><meta charset="utf-8"><title>perf harness</title>
<script>location.replace('/perf-harness/index.html?n=${notes}')</script>`
)

console.log(`✅ www/index.html now redirects to /perf-harness/index.html?n=${notes}`)
