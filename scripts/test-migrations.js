/**
 * Test script to verify migrations are idempotent
 * Usage: node scripts/test-migrations.js
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMigrationIdempotency() {
  console.log('🧪 Testing Migration Idempotency...\n')

  // Read migration files
  const fs = require('fs')
  const path = require('path')

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log('📁 Migration files found:')
  migrationFiles.forEach(file => console.log(`  - ${file}`))
  console.log()

  // Test each migration by running it twice
  for (const file of migrationFiles) {
    console.log(`🔄 Testing: ${file}`)

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

    try {
      // First run
      console.log('  First run...')
      const { error: error1 } = await supabase.rpc('exec_sql', { sql })
      if (error1) {
        console.log(`  ❌ First run failed: ${error1.message}`)
        continue
      }

      // Second run (idempotency test)
      console.log('  Second run (idempotency test)...')
      const { error: error2 } = await supabase.rpc('exec_sql', { sql })
      if (error2) {
        console.log(`  ❌ Second run failed: ${error2.message}`)
        console.log('  This migration is NOT idempotent!')
      } else {
        console.log('  ✅ Idempotent!')
      }

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`)
    }

    console.log()
  }

  console.log('✨ Migration testing complete!')
}

// Alternative: Check current state
async function checkDatabaseState() {
  console.log('🔍 Checking Database State...\n')

  try {
    // Check tables
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    console.log('📋 Public tables:')
    tables?.forEach(table => console.log(`  - ${table.table_name}`))
    console.log()

    // Check bucket
    const { data: buckets } = await supabase
      .from('storage.buckets')
      .select('id, name, public')

    console.log('🪣 Storage buckets:')
    buckets?.forEach(bucket => console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`))
    console.log()

    // Check policies
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, cmd')

    console.log('🔒 RLS Policies:')
    policies?.forEach(policy => console.log(`  - ${policy.policyname} (${policy.tablename}, ${policy.cmd})`))
    console.log()

    // Check indexes
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('tablename', 'notes')

    console.log('🔍 Indexes on notes table:')
    indexes?.forEach(index => console.log(`  - ${index.indexname}`))
    console.log()

  } catch (err) {
    console.log(`❌ Error checking state: ${err.message}`)
  }
}

async function main() {
  console.log('🚀 EverFreeNote Migration Test\n')

  await checkDatabaseState()

  // Note: Testing full idempotency requires more complex setup
  // For now, just check the current state
  console.log('💡 To test full idempotency, you would need to:')
  console.log('   1. Reset database')
  console.log('   2. Run migrations once')
  console.log('   3. Run migrations again')
  console.log('   4. Verify no errors')

  console.log('\n✨ Database state check complete!')
}

main().catch(console.error)

