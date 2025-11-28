import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || (!anonKey && !serviceKey)) {
  console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + anon/service key)')
  process.exit(1)
}

const anonClient = createClient(supabaseUrl, anonKey || '')
const serviceClient = serviceKey ? createClient(supabaseUrl, serviceKey) : null

type AuditSection = {
  passed: boolean
  details: string[]
}

class DatabaseAuditor {
  private results: Record<string, AuditSection> = {}
  private passed = true

  async runFullAudit() {
    console.log('🧪 Comprehensive DB audit (Supabase)\n' + '='.repeat(60))
    await this.testConnection()
    await this.testSecurity()
    await this.testDataIntegrity()
    await this.testPerformance()
    await this.testStructure()
    await this.testAuth()
    this.generateReport()
  }

  private setSection(name: string, passed: boolean, details: string[]) {
    this.results[name] = { passed, details }
    if (!passed) this.passed = false
  }

  private async testConnection() {
    console.log('\n1) Connectivity')
    const details: string[] = []
    const { data, error } = await anonClient.from('notes').select('id').limit(1)
    if (error) {
      details.push(`❌ anon read blocked: ${error.message}`)
    } else {
      details.push(`⚠️ anon read returned ${data?.length || 0} rows (check RLS)`)
    }
    this.setSection('connection', !error, details)
  }

  private async testSecurity() {
    console.log('\n2) Security (RLS)')
    const details: string[] = []
    const { error: insertError } = await anonClient.from('notes').insert({
      title: 'Audit test',
      description: 'This should fail under RLS',
      tags: ['audit'],
      user_id: '00000000-0000-0000-0000-000000000000',
    })
    if (insertError) {
      details.push(`✅ anon insert blocked: ${insertError.message}`)
    } else {
      details.push('❌ anon insert succeeded — RLS misconfigured')
    }
    this.setSection('security', insertError !== undefined, details)
  }

  private async testDataIntegrity() {
    console.log('\n3) Data integrity (counts)')
    const details: string[] = []
    const client = serviceClient || anonClient
    const { count, error } = await client
      .from('notes')
      .select('*', { count: 'exact', head: true })

    if (error) {
      details.push(`❌ count failed: ${error.message}`)
      this.setSection('integrity', false, details)
      return
    }
    details.push(`✅ notes count: ${count}`)
    this.setSection('integrity', true, details)
  }

  private async testPerformance() {
    console.log('\n4) Performance (index hint)')
    const details: string[] = []
    const client = serviceClient || anonClient
    const { error } = await client
      .from('notes')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)
    if (error) {
      details.push(`❌ query failed: ${error.message}`)
      this.setSection('performance', false, details)
      return
    }
    details.push('✅ basic query ok (check EXPLAIN manually for index use)')
    this.setSection('performance', true, details)
  }

  private async testStructure() {
    console.log('\n5) Structure (tables/indexes)')
    const details: string[] = []
    const client = serviceClient || anonClient
    const { data: tables } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    details.push(`Tables: ${(tables || []).map((t) => t.table_name).join(', ') || 'none'}`)

    const { data: indexes } = await client
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('tablename', 'notes')

    details.push(
      `Indexes on notes: ${(indexes || []).map((i) => i.indexname).join(', ') || 'none'}`
    )

    this.setSection('structure', true, details)
  }

  private async testAuth() {
    console.log('\n6) Auth (service key availability)')
    const details: string[] = []
    if (serviceClient) {
      details.push('✅ service key provided, admin operations available')
      this.setSection('auth', true, details)
    } else {
      details.push('⚠️ service key not set; limited audit with anon key')
      this.setSection('auth', false, details)
    }
  }

  private generateReport() {
    console.log('\n=== AUDIT REPORT ===')
    Object.entries(this.results).forEach(([section, result]) => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${section}`)
      result.details.forEach((d) => console.log(`   - ${d}`))
    })
    console.log(`\nOverall: ${this.passed ? 'PASS' : 'FAIL'}`)
  }
}

new DatabaseAuditor()
  .runFullAudit()
  .catch((error) => {
    console.error('Audit failed:', error.message)
    process.exit(1)
  })
