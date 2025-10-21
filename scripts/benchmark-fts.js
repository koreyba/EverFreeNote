/**
 * Performance benchmark script for FTS vs ILIKE search
 * Usage: node scripts/benchmark-fts.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test queries
const TEST_QUERIES = [
  'test',
  'note',
  'important',
  'meeting',
  'project',
  'work',
  'personal',
  'ideas',
]

/**
 * Benchmark FTS search
 */
async function benchmarkFTS(query, userId) {
  const startTime = Date.now()
  
  try {
    const { data, error } = await supabase
      .rpc('search_notes_fts', {
        search_query: `${query}:*`,
        search_language: 'russian',
        min_rank: 0.1,
        result_limit: 20,
        result_offset: 0,
        search_user_id: userId
      })
    
    const duration = Date.now() - startTime
    
    if (error) {
      return { error: error.message, duration }
    }
    
    return {
      duration,
      count: data?.length || 0,
      method: 'fts'
    }
  } catch (error) {
    return {
      error: error.message,
      duration: Date.now() - startTime
    }
  }
}

/**
 * Benchmark ILIKE search
 */
async function benchmarkILIKE(query, userId) {
  const startTime = Date.now()
  const pattern = `%${query}%`
  
  try {
    const { data, error, count } = await supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(20)
    
    const duration = Date.now() - startTime
    
    if (error) {
      return { error: error.message, duration }
    }
    
    return {
      duration,
      count: data?.length || 0,
      method: 'ilike'
    }
  } catch (error) {
    return {
      error: error.message,
      duration: Date.now() - startTime
    }
  }
}

/**
 * Run benchmark suite
 */
async function runBenchmark() {
  console.log('🚀 Starting FTS Performance Benchmark\n')
  
  // Login as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })
  
  if (authError || !authData.user) {
    console.error('❌ Failed to authenticate:', authError?.message)
    process.exit(1)
  }
  
  const userId = authData.user.id
  console.log(`✅ Authenticated as: ${authData.user.email}\n`)
  
  // Get total notes count
  const { count: totalNotes } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  console.log(`📊 Total notes in database: ${totalNotes}\n`)
  
  if (totalNotes === 0) {
    console.log('⚠️  No notes found. Please create some notes first.')
    console.log('   You can use: node scripts/generate-test-notes.js --count 1000\n')
    process.exit(0)
  }
  
  // Run benchmarks for each query
  const results = []
  
  for (const query of TEST_QUERIES) {
    console.log(`Testing query: "${query}"`)
    
    // Run FTS benchmark
    const ftsResult = await benchmarkFTS(query, userId)
    console.log(`  FTS:   ${ftsResult.duration}ms (${ftsResult.count || 0} results)${ftsResult.error ? ` ERROR: ${ftsResult.error}` : ''}`)
    
    // Run ILIKE benchmark
    const ilikeResult = await benchmarkILIKE(query, userId)
    console.log(`  ILIKE: ${ilikeResult.duration}ms (${ilikeResult.count || 0} results)${ilikeResult.error ? ` ERROR: ${ilikeResult.error}` : ''}`)
    
    // Calculate speedup
    if (!ftsResult.error && !ilikeResult.error) {
      const speedup = (ilikeResult.duration / ftsResult.duration).toFixed(2)
      console.log(`  Speedup: ${speedup}x faster\n`)
      
      results.push({
        query,
        fts: ftsResult,
        ilike: ilikeResult,
        speedup: parseFloat(speedup)
      })
    } else {
      console.log()
    }
  }
  
  // Calculate statistics
  if (results.length > 0) {
    const avgFTS = results.reduce((sum, r) => sum + r.fts.duration, 0) / results.length
    const avgILIKE = results.reduce((sum, r) => sum + r.ilike.duration, 0) / results.length
    const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length
    
    console.log('=' .repeat(60))
    console.log('📈 SUMMARY')
    console.log('=' .repeat(60))
    console.log(`Dataset size:      ${totalNotes} notes`)
    console.log(`Queries tested:    ${results.length}`)
    console.log(`\nAverage FTS time:   ${avgFTS.toFixed(2)}ms`)
    console.log(`Average ILIKE time: ${avgILIKE.toFixed(2)}ms`)
    console.log(`Average speedup:    ${avgSpeedup.toFixed(2)}x`)
    console.log()
    
    // Performance verdict
    if (avgSpeedup >= 10) {
      console.log('✅ EXCELLENT: FTS is 10x+ faster than ILIKE')
    } else if (avgSpeedup >= 5) {
      console.log('✅ GOOD: FTS is 5x+ faster than ILIKE')
    } else if (avgSpeedup >= 2) {
      console.log('⚠️  OK: FTS is 2x+ faster than ILIKE')
    } else {
      console.log('❌ POOR: FTS is not significantly faster')
    }
    
    // Check if FTS meets target (< 100ms for 10K notes)
    if (totalNotes >= 10000) {
      if (avgFTS < 100) {
        console.log('✅ FTS meets performance target (< 100ms for 10K+ notes)')
      } else {
        console.log(`❌ FTS does not meet performance target (${avgFTS.toFixed(2)}ms > 100ms)`)
      }
    }
  }
  
  // Logout
  await supabase.auth.signOut()
  
  console.log('\n✅ Benchmark complete!')
}

// Run benchmark
runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error)
  process.exit(1)
})

