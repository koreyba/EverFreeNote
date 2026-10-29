import { defineConfig } from 'cypress'
import { appendFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  e2e: {
    baseUrl: process.env.HISTORY_PREVIEW_URL ?? 'http://127.0.0.1:3114',
    specPattern: 'cypress/e2e/History*Prototype.cy.ts',
    supportFile: false,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      config.env.qaAnonKey = process.env.QA_SUPABASE_ANON_KEY
      const createdAccounts = new Set<string>()
      const runDirectory = mkdtempSync(join(tmpdir(), 'everfreenote-history-qa-'))
      on('task', {
        historyAccount(id: string) {
          createdAccounts.add(id)
          appendFileSync(join(runDirectory, 'fixture-ids.txt'), `${id}\n`)
          return null
        },
        async deleteHistoryAccount(id: string) {
          const serviceKey = process.env.QA_SUPABASE_SERVICE_ROLE_KEY
          if (!serviceKey || !createdAccounts.has(id)) throw new Error('Refusing to delete an unregistered test account')
          const response = await fetch(`http://127.0.0.1:55421/auth/v1/admin/users/${encodeURIComponent(id)}`, {
            method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          })
          if (!response.ok) throw new Error(`Test account cleanup failed: ${response.status}`)
          createdAccounts.delete(id)
          return response.status
        },
        historyStep(message: string) { appendFileSync(join(runDirectory, 'progress.txt'), `${message}\n`); return null },
      })
      return config
    },
  },
  video: false,
  retries: 0,
})
