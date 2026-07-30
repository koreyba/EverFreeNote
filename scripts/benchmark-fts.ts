import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const testAuthEmail = process.env.TEST_USER_EMAIL ?? ''
const testAuthPassword = process.env.TEST_USER_PASSWORD ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}
if (!testAuthEmail || !testAuthPassword) {
  console.error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

type BenchmarkResult = {
  duration: number
  count?: number
  method: 'fts' | 'ilike'
  error?: string
}

type BenchmarkComparison = {
  query: string
  fts: BenchmarkResult
  ilike: BenchmarkResult
  speedup: number
}

async function benchmarkFTS(query: string, userId: string): Promise<BenchmarkResult> {
  const startTime = Date.now()

  try {
    const { data, error } = await supabase.rpc('search_notes_fts', {
      search_query: `${query}:*`,
      search_language: 'russian',
      min_rank: 0.1,
      result_limit: 20,
      result_offset: 0,
      search_user_id: userId,
    })

    const duration = Date.now() - startTime

    if (error) {
      return { error: error.message, duration, method: 'fts' }
    }

    return {
      duration,
      count: data?.length || 0,
      method: 'fts',
    }
  } catch (error: any) {
    return {
      error: error.message,
      duration: Date.now() - startTime,
      method: 'fts',
    }
  }
}

async function benchmarkILIKE(query: string, userId: string): Promise<BenchmarkResult> {
  const startTime = Date.now()
  const pattern = `%${query}%`

  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(20)

    const duration = Date.now() - startTime

    if (error) {
      return { error: error.message, duration, method: 'ilike' }
    }

    return {
      duration,
      count: data?.length || 0,
      method: 'ilike',
    }
  } catch (error: any) {
    return {
      error: error.message,
      duration: Date.now() - startTime,
      method: 'ilike',
    }
  }
}

async function runQueries(userId: string): Promise<BenchmarkComparison[]> {
  const results: BenchmarkComparison[] = []

  for (const query of TEST_QUERIES) {
    console.log(`Testing query: "${query}"`)

    const ftsResult = await benchmarkFTS(query, userId)
    console.log(
      `  FTS:   ${ftsResult.duration}ms (${ftsResult.count || 0} results)${
        ftsResult.error ? ` ERROR: ${ftsResult.error}` : ''
      }`,
    )

    const ilikeResult = await benchmarkILIKE(query, userId)
    console.log(
      `  ILIKE: ${ilikeResult.duration}ms (${ilikeResult.count || 0} results)${
        ilikeResult.error ? ` ERROR: ${ilikeResult.error}` : ''
      }`,
    )

    if (!ftsResult.error && !ilikeResult.error) {
      const speedup = Number.parseFloat((ilikeResult.duration / ftsResult.duration).toFixed(2))
      console.log(`  Speedup: ${speedup}x faster\n`)
      results.push({ query, fts: ftsResult, ilike: ilikeResult, speedup })
    } else {
      console.log()
    }
  }

  return results
}

async function runBenchmark() {
  console.log('🚀 Starting FTS Performance Benchmark\n')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testAuthEmail,
    password: testAuthPassword,
  })

  if (authError || !authData.user) {
    console.error('❌ Failed to authenticate:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Authenticated as: ${authData.user.email}\n`)

  const { count: totalNotes } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  console.log(`📊 Total notes in database: ${totalNotes}\n`)

  if (!totalNotes) {
    console.log('⚠️  No notes found. Please create some notes first.')
    console.log('   You can use: node scripts/generate-test-notes.ts --count 1000\n')
    process.exit(0)
  }

  const results = await runQueries(userId)

  if (results.length > 0) {
    const avgFTS = results.reduce((sum, r) => sum + r.fts.duration, 0) / results.length
    const avgILIKE = results.reduce((sum, r) => sum + r.ilike.duration, 0) / results.length
    const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length

    console.log('='.repeat(60))
    console.log('📈 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Dataset size:      ${totalNotes} notes`)
    console.log(`Queries tested:    ${results.length}`)
    console.log(`\nAverage FTS time:   ${avgFTS.toFixed(2)}ms`)
    console.log(`Average ILIKE time: ${avgILIKE.toFixed(2)}ms`)
    console.log(`Average speedup:    ${avgSpeedup.toFixed(2)}x\n`)

    if (avgSpeedup >= 10) {
      console.log('✅ EXCELLENT: FTS is 10x+ faster than ILIKE')
    } else if (avgSpeedup >= 5) {
      console.log('✅ GOOD: FTS is 5x+ faster than ILIKE')
    } else if (avgSpeedup >= 2) {
      console.log('⚠️  OK: FTS is 2x+ faster than ILIKE')
    } else {
      console.log('❌ POOR: FTS is not significantly faster')
    }

    if (totalNotes >= 10000) {
      if (avgFTS < 100) {
        console.log('✅ FTS meets performance target (< 100ms for 10K+ notes)')
      } else {
        console.log(`❌ FTS does not meet performance target (${avgFTS.toFixed(2)}ms > 100ms)`)
      }
    }
  }

  console.log('\n✨ Benchmark complete.')
}

runBenchmark().catch((error) => {
  console.error(error)
  process.exit(1)
})
