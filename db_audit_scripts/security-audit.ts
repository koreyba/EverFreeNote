import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  console.error('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL)')
  process.exit(1)
}

if (!anonKey && !serviceKey) {
  console.error('Missing Supabase credentials (anon or service key)')
  process.exit(1)
}

const url = supabaseUrl
const clientKey = (serviceKey || anonKey)! as string
const client = createClient(url, clientKey)

async function securityAudit() {
  console.log('\nSecurity audit (RLS/permissions) - EverFreeNote\n')

  try {
    console.log('1) Reading notes with provided key...')
    const { data: notes, error: notesError } = await client
      .from('notes')
      .select('id, user_id, title')
      .limit(2)

    if (notesError) {
      console.log('   FAIL: Cannot read notes (RLS likely enforced):', notesError.message)
    } else {
      console.log(`   OK: Read succeeded (${notes?.length || 0} rows). RLS may be bypassed by this key.`)
      notes?.forEach((n) => console.log(`      - ${n.id} (${n.user_id}): ${n.title}`))
    }

    console.log('\n2) Anonymous read attempt...')
    const anon = createClient(url, anonKey || '')
    const { data: anonData, error: anonError } = await anon.from('notes').select('id').limit(1)
    if (anonError) {
      console.log('   OK: Anonymous read blocked (expected):', anonError.message)
    } else {
      console.log(`   WARN: Anonymous read returned ${anonData?.length || 0} rows. Check RLS policies!`)
    }

    console.log('\n3) Attempting forbidden insert as anon...')
    const { error: insertError } = await anon.from('notes').insert({
      title: 'RLS test note',
      description: 'This should fail under RLS',
      tags: ['security'],
      user_id: '00000000-0000-0000-0000-000000000000',
    })
    if (insertError) {
      console.log('   OK: Anonymous insert blocked:', insertError.message)
    } else {
      console.log('   WARN: Anonymous insert succeeded - RLS misconfiguration!')
    }

    console.log('\nSecurity audit complete.\n')
  } catch (error: any) {
    console.error('Audit error:', error.message)
    process.exit(1)
  }
}

securityAudit()
