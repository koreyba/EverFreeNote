#!/usr/bin/env node

/**
 * Initialize test users for local development
 * 
 * This script creates test users using Supabase Admin API.
 * It should be run after `npx supabase start` to set up test users.
 * 
 * Usage: node scripts/init-test-users.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'testpassword123',
    notes: [
      {
        title: 'Test User Note',
        description: '<p>This is a test note for the test user account.</p>',
        tags: ['test']
      }
    ]
  },
  {
    email: 'skip-auth@example.com',
    password: 'testpassword123',
    notes: [
      {
        title: 'Welcome to EverFreeNote',
        description: '<p>Welcome! This is your first note. You can:</p><ul><li>Create new notes</li><li>Edit existing notes</li><li>Add tags for organization</li><li>Search through your notes</li></ul>',
        tags: ['welcome', 'tutorial']
      },
      {
        title: 'JavaScript Tips',
        description: '<p>Some useful JavaScript tips:</p><ul><li>Use <code>const</code> and <code>let</code> instead of <code>var</code></li><li>Arrow functions for cleaner code</li><li>Destructuring for easier data access</li><li>Template literals for string interpolation</li></ul>',
        tags: ['javascript', 'programming', 'tips']
      },
      {
        title: 'Meeting Notes - Project Kickoff',
        description: '<p><strong>Date:</strong> October 15, 2025</p><p><strong>Attendees:</strong> Team members</p><p><strong>Topics:</strong></p><ul><li>Project timeline</li><li>Resource allocation</li><li>Next steps</li></ul><p><strong>Action items:</strong></p><ol><li>Set up development environment</li><li>Create initial wireframes</li><li>Schedule follow-up meeting</li></ol>',
        tags: ['meeting', 'work', 'project']
      },
      {
        title: 'Shopping List',
        description: '<p>Things to buy:</p><ul><li>Milk</li><li>Bread</li><li>Eggs</li><li>Coffee</li><li>Vegetables</li></ul>',
        tags: ['personal', 'shopping']
      },
      {
        title: 'Book Ideas',
        description: '<p>Books I want to read:</p><ol><li><em>Clean Code</em> by Robert Martin</li><li><em>The Pragmatic Programmer</em></li><li><em>Design Patterns</em></li></ol><p><strong>Fiction:</strong></p><ul><li>Science fiction novels</li><li>Mystery thrillers</li></ul>',
        tags: ['books', 'reading', 'personal']
      }
    ]
  }
]

async function initTestUsers() {
  console.log('🚀 Initializing test users for local development\n')

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Get existing users
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers()
    const existingEmails = new Set(existingUsers.map(u => u.email))

    for (const testUser of TEST_USERS) {
      // Check if user already exists
      if (existingEmails.has(testUser.email)) {
        console.log(`✅ ${testUser.email} already exists`)
        
        // Find user ID
        const user = existingUsers.find(u => u.email === testUser.email)
        
        // Check if notes exist
        const { data: notes } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (!notes || notes.length === 0) {
          console.log(`   Adding ${testUser.notes.length} sample notes...`)
          
          for (const note of testUser.notes) {
            await supabase
              .from('notes')
              .insert({
                user_id: user.id,
                title: note.title,
                description: note.description,
                tags: note.tags
              })
          }
          
          console.log(`   ✅ Notes added`)
        } else {
          console.log(`   Notes already exist`)
        }
        
        continue
      }

      // Create new user
      console.log(`Creating ${testUser.email}...`)
      const { data, error } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true
      })

      if (error) {
        console.error(`❌ Failed to create ${testUser.email}:`, error.message)
        continue
      }

      console.log(`✅ Created ${testUser.email}`)
      console.log(`   User ID: ${data.user.id}`)

      // Add sample notes
      if (testUser.notes && testUser.notes.length > 0) {
        console.log(`   Adding ${testUser.notes.length} sample notes...`)
        
        for (const note of testUser.notes) {
          await supabase
            .from('notes')
            .insert({
              user_id: data.user.id,
              title: note.title,
              description: note.description,
              tags: note.tags
            })
        }
        
        console.log(`   ✅ Notes added`)
      }
    }

    // Test logins
    console.log('\n--- Testing Logins ---\n')
    
    for (const testUser of TEST_USERS) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })

      if (error) {
        console.error(`❌ ${testUser.email}: Login failed -`, error.message)
      } else {
        console.log(`✅ ${testUser.email}: Login successful`)
        await supabase.auth.signOut()
      }
    }

    console.log('\n✅ All done! Test users are ready.\n')
    console.log('Credentials:')
    TEST_USERS.forEach(u => {
      console.log(`  ${u.email} / ${u.password}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

initTestUsers()

