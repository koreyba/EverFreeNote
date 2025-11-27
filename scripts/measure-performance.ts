import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const authEmail = process.env.TEST_EMAIL
const authPassword = process.env.TEST_PASSWORD

if (!supabaseUrl || (!anonKey && !serviceKey)) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

function createSupabaseClient(): SupabaseClient {
  const key = serviceKey || anonKey!
  return createClient(supabaseUrl!, key)
}

const supabase = createSupabaseClient()

async function measureQuery<T>(name: string, queryFn: () => Promise<T>) {
  const start = performance.now()
  try {
    const result = await queryFn()
    const duration = performance.now() - start
    console.log(`${name}: ${duration.toFixed(2)}ms`)
    return { result, duration }
  } catch (error: any) {
    const duration = performance.now() - start
    console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error.message)
    throw error
  }
}

async function runPerformanceTests(userId: string) {
  console.log('🔍 Running Performance Tests...\n')

  const tests: Array<{ name: string; fn: () => Promise<any> }> = [
    {
      name: 'Paginated Query (50 notes)',
      fn: async () =>
        supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .range(0, 49),
    },
    {
      name: 'Paginated Query (100 notes)',
      fn: async () =>
        supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .range(0, 99),
    },
    {
      name: 'Tag Filter Query',
      fn: async () =>
        supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at')
          .eq('user_id', userId)
          .contains('tags', ['work'])
          .order('updated_at', { ascending: false })
          .range(0, 49),
    },
    {
      name: 'Search Query (ilike)',
      fn: async () =>
        supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at')
          .eq('user_id', userId)
          .or('title.ilike.%meeting%,description.ilike.%meeting%')
          .order('updated_at', { ascending: false })
          .range(0, 49),
    },
    {
      name: 'Count Query',
      fn: async () =>
        supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
    },
    {
      name: 'Single Note Query',
      fn: async () => {
        const { data } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .single()

        if (!data) return { error: { message: 'No notes found' } }

        return supabase.from('notes').select('*').eq('id', data.id).single()
      },
    },
  ]

  const results = []

  for (const test of tests) {
    const { result, duration } = await measureQuery(test.name, test.fn)
    const status = (result as any)?.error ? '❌' : '✅'
    const count = (result as any)?.data?.length || (result as any)?.count || 0
    console.log(`${status} ${test.name}: ${duration.toFixed(2)}ms ${count ? `(${count} rows)` : ''}`)
    if ((result as any)?.error) {
      console.log(`   Error: ${(result as any).error.message || (result as any).error}`)
    }
    results.push({ name: test.name, duration, success: !((result as any)?.error), count })
  }

  const success = results.filter((r) => r.success)
  const avgDuration = success.reduce((sum, r) => sum + r.duration, 0) / (success.length || 1)

  console.log('\n📊 Performance Summary:')
  console.log('─────────────────────────────────────────────')
  console.log(`Average query time: ${avgDuration.toFixed(2)}ms`)
  console.log(`Successful queries: ${success.length}/${results.length}`)
}

async function main() {
  console.log('🚀 EverFreeNote Performance Measurement\n')

  let userId = process.argv[2]

  if (!userId && authEmail && authPassword) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })
    if (error || !data.user) {
      console.error('❌ Authentication failed:', error?.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`👤 Authenticated as ${data.user.email}`)
  }

  if (!userId) {
    console.error('❌ Provide userId as arg or set TEST_EMAIL/TEST_PASSWORD for auth')
    process.exit(1)
  }

  const { count, error: countError } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    console.error('❌ Failed to count notes:', countError.message)
    process.exit(1)
  }

  console.log(`📝 Total notes: ${count}\n`)
  if (!count) {
    console.log('⚠️  No notes found. Run generate-test-notes.ts first.')
    process.exit(0)
  }

  await runPerformanceTests(userId)
  console.log('\n✨ Performance measurement complete!')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
