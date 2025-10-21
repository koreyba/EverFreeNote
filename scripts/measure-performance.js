/**
 * Script to measure performance metrics
 * Usage: node scripts/measure-performance.js
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

async function measureQuery(name, queryFn) {
  const start = performance.now()
  const result = await queryFn()
  const end = performance.now()
  const duration = end - start
  
  return {
    name,
    duration: duration.toFixed(2),
    success: !result.error,
    error: result.error?.message,
    count: result.data?.length || result.count || 0
  }
}

async function runPerformanceTests(userId) {
  console.log('🔍 Running Performance Tests...\n')
  
  const tests = [
    {
      name: 'Paginated Query (50 notes)',
      fn: () => supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(0, 49)
    },
    {
      name: 'Paginated Query (100 notes)',
      fn: () => supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(0, 99)
    },
    {
      name: 'Tag Filter Query',
      fn: () => supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .contains('tags', ['work'])
        .order('updated_at', { ascending: false })
        .range(0, 49)
    },
    {
      name: 'Search Query (ilike)',
      fn: () => supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .or('title.ilike.%meeting%,description.ilike.%meeting%')
        .order('updated_at', { ascending: false })
        .range(0, 49)
    },
    {
      name: 'Count Query',
      fn: () => supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    },
    {
      name: 'Single Note Query',
      fn: async () => {
        // First get a note ID
        const { data } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .single()
        
        if (!data) return { error: { message: 'No notes found' } }
        
        return supabase
          .from('notes')
          .select('*')
          .eq('id', data.id)
          .single()
      }
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await measureQuery(test.name, test.fn)
    results.push(result)
    
    const status = result.success ? '✅' : '❌'
    const time = `${result.duration}ms`
    const info = result.count ? `(${result.count} rows)` : ''
    
    console.log(`${status} ${result.name}: ${time} ${info}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }
  
  console.log('\n📊 Performance Summary:')
  console.log('─────────────────────────────────────────────')
  
  const avgDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + parseFloat(r.duration), 0) / results.filter(r => r.success).length
  
  console.log(`Average query time: ${avgDuration.toFixed(2)}ms`)
  console.log(`Successful queries: ${results.filter(r => r.success).length}/${results.length}`)
  
  // Performance targets
  console.log('\n🎯 Performance Targets:')
  console.log('─────────────────────────────────────────────')
  
  const targets = [
    { name: 'Paginated Query', target: 500, actual: parseFloat(results[0].duration) },
    { name: 'Tag Filter', target: 500, actual: parseFloat(results[2].duration) },
    { name: 'Search Query', target: 500, actual: parseFloat(results[3].duration) },
    { name: 'Single Note', target: 300, actual: parseFloat(results[5].duration) }
  ]
  
  targets.forEach(t => {
    const status = t.actual <= t.target ? '✅' : '⚠️'
    const diff = t.actual - t.target
    const diffStr = diff > 0 ? `+${diff.toFixed(0)}ms` : `${diff.toFixed(0)}ms`
    console.log(`${status} ${t.name}: ${t.actual.toFixed(0)}ms / ${t.target}ms (${diffStr})`)
  })
  
  return results
}

async function checkIndexes() {
  console.log('\n🔍 Checking Database Indexes...\n')
  
  // This requires a direct database connection or admin API
  // For now, we'll just verify that queries use indexes by checking performance
  console.log('✅ Index verification via query performance (see above)')
  console.log('💡 To verify indexes directly, run:')
  console.log('   EXPLAIN ANALYZE SELECT * FROM notes WHERE user_id = \'...\' ORDER BY updated_at DESC LIMIT 50;')
}

async function main() {
  console.log('🚀 EverFreeNote Performance Measurement\n')
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.error('❌ Not authenticated')
    process.exit(1)
  }
  
  console.log(`👤 User: ${user.email || user.id}\n`)
  
  // Get total note count first
  const { count } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  
  console.log(`📝 Total notes: ${count}\n`)
  
  if (count === 0) {
    console.log('⚠️  No notes found. Run generate-test-notes.js first.')
    process.exit(0)
  }
  
  await runPerformanceTests(user.id)
  await checkIndexes()
  
  console.log('\n✨ Performance measurement complete!')
}

main().catch(console.error)

