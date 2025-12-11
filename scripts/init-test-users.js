#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * JS version of the test-users seeder to make `npm run db:init-users` work
 * without ts-node. Idempotent for users: creates only if missing.
 * Notes are inserted on every run (kept same behavior as TS source).
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

if (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH !== 'true') {
  console.log('Test user seeding skipped because NEXT_PUBLIC_ENABLE_TEST_AUTH is not true')
  process.exit(0)
}

// Use Supabase local API port (see supabase/config.toml -> [api].port)
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  'REDACTED_JWT'

const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'testpassword123',
    notes: [
      {
        title: 'Test User Note',
        description: '<p>This is a test note for the test user account.</p>',
        tags: ['test'],
      },
    ],
  },
  {
    email: 'skip-auth@example.com',
    password: 'testpassword123',
    notes: [
      {
        title: 'Welcome to EverFreeNote',
        description:
          '<p>Welcome! This is your first note. You can:</p><ul><li>Create new notes</li><li>Edit existing notes</li><li>Add tags for organization</li><li>Search through your notes</li></ul>',
        tags: ['welcome', 'tutorial'],
      },
      {
        title: 'JavaScript Tips',
        description:
          '<p>Some useful JavaScript tips:</p><ul><li>Use <code>const</code> and <code>let</code> instead of <code>var</code></li><li>Arrow functions for cleaner code</li><li>Destructuring for easier data access</li><li>Template literals for string interpolation</li></ul>',
        tags: ['javascript', 'tips'],
      },
    ],
  },
]

async function ensureUser(email, password) {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: existing, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()
  if (fetchError) throw fetchError

  const found = existing?.users?.find((u) => u.email === email)
  if (found) return found.id

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user?.id ?? null
}

async function insertNotes(userId, notes) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  for (const note of notes) {
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      title: note.title,
      description: note.description,
      tags: note.tags,
    })
    if (error) {
      console.error(`Failed to insert note for ${userId}:`, error.message)
    }
  }
}

async function main() {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Smoke-test logins
  const testLogins = async () => {
    console.log('\n--- Testing Logins ---\n')
    for (const user of TEST_USERS) {
      const { error } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })
      if (error) {
        console.error(`❌ ${user.email}: Login failed - ${error.message}`)
      } else {
        console.log(`✅ ${user.email}: Login successful`)
        await supabaseAdmin.auth.signOut()
      }
    }
  }

  for (const user of TEST_USERS) {
    try {
      const userId = await ensureUser(user.email, user.password)
      if (userId) {
        await insertNotes(userId, user.notes)
        console.log(`Seeded user ${user.email}`)
      }
    } catch (error) {
      console.error(`Error seeding user ${user.email}:`, error.message)
    }
  }

  await testLogins()

  console.log('\nCredentials:')
  TEST_USERS.forEach((u) => console.log(`  ${u.email} / ${u.password}`))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
