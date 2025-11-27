import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const client = createClient(supabaseUrl, anonKey)

async function debugRLSStatus() {
  console.log('🔍 Debug RLS status (anon key)\n')

  // 1. Direct read without filters
  const { data: directData, error: directError } = await client.from('notes').select('*').limit(2)
  if (directError) {
    console.log('✅ RLS enforced on unrestricted read:', directError.message)
  } else {
    console.log(`⚠️ RLS not enforced? Received ${directData?.length || 0} rows`)
    directData?.forEach((n, i) => console.log(`  ${i + 1}. ${n.id} (${n.user_id}) ${n.title}`))
  }

  // 2. Filtered read on dummy user
  const testUserId = '00000000-0000-0000-0000-000000000000'
  const { data: filteredData, error: filteredError } = await client
    .from('notes')
    .select('*')
    .eq('user_id', testUserId)

  if (filteredError) {
    console.log('✅ Filtered read blocked (as expected):', filteredError.message)
  } else {
    console.log(`⚠️ Filtered read returned ${filteredData?.length || 0} rows for user ${testUserId}`)
  }

  // 3. Insert attempt
  const { error: insertError } = await client.from('notes').insert({
    title: 'RLS debug note',
    description: 'Should fail under RLS',
    tags: ['rls', 'debug'],
    user_id: testUserId,
  })
  if (insertError) {
    console.log('✅ Insert blocked:', insertError.message)
  } else {
    console.log('⚠️ Insert succeeded — RLS misconfiguration')
  }

  console.log('\nDone.')
}

debugRLSStatus().catch((error) => {
  console.error(error)
  process.exit(1)
})
