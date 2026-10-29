/* global require, __dirname, process, window, console */
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
  '/preflight.js': compile('ui/web/lib/tagLocalPreflight.ts').replace('@ui/web/lib/offlineOwnership', '/ownership.js'),
}
const server = http.createServer((req, res) => {
  if (files[req.url]) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(files[req.url]); return }
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('<script type="module">import {webOfflineStorageAdapter} from "/storage.js"; import {assertTagLocalState} from "/preflight.js"; window.adapter=webOfflineStorageAdapter; window.preflight=assertTagLocalState;</script>')
})
let browser
let profile
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'everfreenote-tag-tabs-'))
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome')
  if (!fs.existsSync(executablePath)) throw new Error('Set CHROME_PATH to a local Chromium executable')
  browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: profile })
  const open = async fallback => {
    const page = await browser.newPage()
    if (fallback) await page.evaluateOnNewDocument(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }) })
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.waitForFunction(() => !!window.adapter && !!window.preflight)
    return page
  }
  const [first, second] = await Promise.all([open(false), open(false)])
  await first.evaluate(async () => {
    await window.adapter.clearAll()
    await window.adapter.saveNote({ id: 'a', user_id: 'owner-a', title: 'A private', description: 'A body', tags: ['old'], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
    await window.adapter.upsertQueueItem({ id: 'a-op', noteId: 'a', operation: 'update', payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    window.preflight(await window.adapter.loadNotes(), await window.adapter.getQueue(), 'owner-b', window.adapter.atomicTagPatches)
    window.started = false
    window.completion = (async () => {
      await new Promise(resolve => { window.release = resolve; window.started = true })
      try { window.preflight(await window.adapter.loadNotes(), await window.adapter.getQueue(), 'owner-b', window.adapter.atomicTagPatches); return 'success' }
      catch (error) { return error.message }
    })()
  })
  await first.waitForFunction(() => window.started)
  await second.evaluate(async () => window.adapter.upsertQueueItem({ id: 'b-op', noteId: 'b', operation: 'update', payload: { user_id: 'owner-b' }, clientUpdatedAt: '2026-10-02T00:00:00.000Z', status: 'pending' }))
  await first.evaluate(() => window.release())
  assert.match(await first.evaluate(() => window.completion), /Finish syncing your notes/)
  assert.equal((await first.evaluate(() => window.adapter.getQueue())).length, 2)
  await first.evaluate(async () => window.adapter.clearAll())
  for (let index = 0; index < 5; index++) {
    const initial = { id: `a-${index}`, user_id: 'owner-a', title: 'Before', description: '', tags: ['a'], status: 'synced', updatedAt: '2026-10-01T00:00:00.000Z' }
    const b = { id: `b-${index}`, user_id: 'owner-b', title: 'B', description: '', tags: ['old'], status: 'synced', updatedAt: '2026-10-01T00:00:00.000Z' }
    await first.evaluate(async ({ initial, b }) => { await window.adapter.saveNote(initial); await window.adapter.saveNote(b) }, { initial, b })
    const edited = { ...initial, title: 'Concurrent A edit', status: 'pending', updatedAt: '2026-10-02T00:00:00.000Z' }
    const [patched] = await Promise.all([
      first.evaluate(async b => window.adapter.patchSyncedTags([{ expected: b, tags: ['new'] }]), b),
      second.evaluate(async edited => window.adapter.saveNote(edited), edited),
    ])
    assert.deepEqual(patched, [b.id])
    const notes = await first.evaluate(() => window.adapter.loadNotes())
    assert.deepEqual(notes.find(note => note.id === initial.id), edited)
    assert.deepEqual(notes.find(note => note.id === b.id).tags, ['new'])
  }
  await Promise.all([first.close(), second.close()])
  const [fallbackA, fallbackB] = await Promise.all([open(true), open(true)])
  await fallbackA.evaluate(async () => {
    await window.adapter.clearAll()
    await window.adapter.saveNote({ id: 'foreign', user_id: 'owner-a', title: 'A private', description: 'A body', tags: ['old'], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
    await window.adapter.upsertQueueItem({ id: 'foreign-op', noteId: 'foreign', operation: 'update', payload: { user_id: 'owner-a' }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
  })
  const block = await fallbackB.evaluate(async () => {
    const notes = await window.adapter.loadNotes()
    const queue = await window.adapter.getQueue()
    try { window.preflight(notes, queue, 'owner-b', window.adapter.atomicTagPatches); return 'unexpected success' }
    catch (error) { return error.message }
  })
  assert.match(block, /another or unverified account/)
  assert.doesNotMatch(block, /A private|A body|Finish syncing your notes/)
  const preserved = await fallbackA.evaluate(async () => ({ notes: await window.adapter.loadNotes(), queue: await window.adapter.getQueue() }))
  assert.equal(preserved.notes[0].title, 'A private')
  assert.equal(preserved.queue[0].id, 'foreign-op')
  console.log(JSON.stringify({ result: 'PASS', environment: 'two Chromium tabs, fresh origin; actual IndexedDB and separate fallback pass', idb: 'foreign queue ignored for B; own queue inserted from second tab blocks completion; five concurrent per-record tag patches preserve the foreign edit', fallback: 'foreign data blocks before mutation with generic guidance and remains intact', limitations: 'adapter/preflight-level checks; no real API, actual quota, old-client race protection, or guarantee after final check' }, null, 2))
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { if (browser) await browser.close(); server.close(); if (profile) fs.rmSync(profile, { recursive: true, force: true }) })
