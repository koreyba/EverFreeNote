/* global require, __dirname, process, window, navigator, crypto, Storage, DOMException, localStorage, console */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const root = path.resolve(__dirname, '..')
const ts = require(path.join(root, 'node_modules/typescript'))
const puppeteer = require(path.join(root, 'node_modules/puppeteer-core'))
const compile = file => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const files = {
  '/storage.js': compile('ui/web/adapters/offlineStorage.ts')
    .replace('@core/constants/offline', '/constants.js').replace('@ui/web/lib/offlineOwnership', '/ownership.js'),
  '/constants.js': compile('core/constants/offline.ts'),
  '/ownership.js': compile('ui/web/lib/offlineOwnership.ts'),
}
const server = http.createServer((req, res) => {
  if (files[req.url]) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(files[req.url]); return }
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('<script type="module">import {webOfflineStorageAdapter} from "/storage.js"; window.adapter=webOfflineStorageAdapter;</script>')
})
let browser
let profile
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'everfreenote-legacy-claim-'))
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome')
  if (!fs.existsSync(executablePath)) throw new Error('Set CHROME_PATH to a local Chromium executable')
  browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: profile })
  const [a, b] = await Promise.all([browser.newPage(), browser.newPage()])
  for (const page of [a, b]) {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
    })
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.waitForFunction(() => !!window.adapter && !!crypto.subtle)
  }
  const seed = () => {
    const note = { id: 'legacy-note', title: 'Owner A draft', description: 'Local body', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' }
    const item = { id: 'legacy-create', noteId: note.id, operation: 'create', payload: { user_id: 'owner-a', title: note.title, description: note.description, tags: [] }, status: 'pending', clientUpdatedAt: note.updatedAt }
    return { note, item }
  }
  await a.evaluate(async ({ note, item }) => { await window.adapter.saveNote(note); await window.adapter.upsertQueueItem(item) }, seed())
  await a.evaluate(({ note, item }) => {
    const original = crypto.subtle.digest.bind(crypto.subtle)
    Object.defineProperty(crypto.subtle, 'digest', { configurable: true, value: (...args) => new Promise(resolve => { window.releaseDigest = () => resolve(original(...args)) }) })
    window.claimResult = window.adapter.claimLegacySnapshot(note, item, 'owner-a')
  }, seed())
  await a.waitForFunction(() => !!window.releaseDigest)
  await b.evaluate(async () => window.adapter.saveNote({ id: 'other-note', user_id: 'owner-b', title: 'Other account', description: '', tags: [], status: 'pending', updatedAt: '2026-10-02T00:00:00.000Z' }))
  const notesBeforeClaim = await b.evaluate(() => localStorage.getItem('offline_notes'))
  await a.evaluate(() => window.releaseDigest())
  assert.equal(await a.evaluate(() => window.claimResult), true)
  await a.evaluate(() => { delete crypto.subtle.digest })
  assert.equal(await b.evaluate(() => localStorage.getItem('offline_notes')), notesBeforeClaim, 'claim rewrote legacy notes')
  assert.equal((await b.evaluate(() => window.adapter.loadNotes())).length, 2)
  await a.evaluate(async ({ note, item }) => { await window.adapter.removeQueueItems([item.id]); await window.adapter.markSynced(note.id, note.updatedAt, note.updatedAt) }, seed())
  await a.reload()
  await a.waitForFunction(() => !!window.adapter)
  const claims = await a.evaluate(async () => {
    const notes = await window.adapter.loadNotes()
    return { a: await window.adapter.getLegacyClaims('owner-a', notes), b: await window.adapter.getLegacyClaims('owner-b', notes) }
  })
  assert.deepEqual(claims, { a: ['legacy-note'], b: [] })
  await b.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('offline_notes'))
    notes.find(note => note.id === 'legacy-note').title = 'Changed by old client'
    localStorage.setItem('offline_notes', JSON.stringify(notes))
  })
  assert.deepEqual(await a.evaluate(async () => window.adapter.getLegacyClaims('owner-a', await window.adapter.loadNotes())), [])
  await a.evaluate(async () => window.adapter.clearAll())
  await a.evaluate(async ({ note, item }) => { await window.adapter.saveNote(note); await window.adapter.upsertQueueItem(item) }, seed())
  const quota = await a.evaluate(async ({ note, item }) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('offline_owner_claim_v1:')) throw new DOMException('Simulated full storage', 'QuotaExceededError')
      return original.call(this, key, value)
    }
    try { await window.adapter.claimLegacySnapshot(note, item, 'owner-a'); return 'unexpected success' }
    catch (error) { return error.name }
    finally { Storage.prototype.setItem = original }
  }, seed())
  assert.equal(quota, 'QuotaExceededError')
  const preserved = await a.evaluate(async () => ({ notes: await window.adapter.loadNotes(), queue: await window.adapter.getQueue() }))
  assert.equal(preserved.notes[0].title, 'Owner A draft')
  assert.equal(preserved.queue[0].id, 'legacy-create')
  console.log(JSON.stringify({ result: 'PASS', environment: 'two real Chromium tabs, fallback localStorage, fresh origin and no Web Locks', concurrentOtherNote: 'preserved without rewriting legacy notes', restart: 'owner A proof survives; owner B has no proof', oldClientEdit: 'changed snapshot invalidates proof', quota: 'simulated claim write failure preserves note and queue', limitations: 'adapter-level test; no API or actual browser quota exhaustion; legacy array races and old clients remain' }, null, 2))
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { if (browser) await browser.close(); server.close(); if (profile) fs.rmSync(profile, { recursive: true, force: true }) })
