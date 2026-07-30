import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const titles = [
  'Meeting Notes',
  'Project Ideas',
  'Todo List',
  'Research Notes',
  'Book Summary',
  'Code Snippets',
  'Design Mockups',
  'Client Feedback',
  'Sprint Planning',
  'Bug Report',
  'Feature Request',
  'Architecture Design',
  'API Documentation',
  'Database Schema',
  'Testing Strategy',
  'Deployment Notes',
  'Performance Metrics',
  'User Feedback',
  'Marketing Ideas',
  'Product Roadmap',
  'Technical Debt',
  'Code Review Notes',
  'Interview Questions',
  'Learning Resources',
  'Conference Notes',
]

const tags = [
  'work',
  'personal',
  'urgent',
  'idea',
  'todo',
  'done',
  'bug',
  'feature',
  'design',
  'code',
  'meeting',
  'research',
  'documentation',
  'testing',
  'review',
]

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`

export function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new RangeError('Cannot select a random element from an empty array')
  }
  return array[crypto.randomInt(0, array.length)]
}

export function getRandomElements<T>(array: T[], count: number): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy.slice(0, count)
}

export function generateNote(index: number) {
  const title = `${getRandomElement(titles)} #${index + 1}`
  const paragraphs = crypto.randomInt(1, 6)
  const description = Array(paragraphs).fill(loremIpsum).join('\n\n')
  const noteTags = getRandomElements(tags, crypto.randomInt(1, 5))

  const daysAgo = crypto.randomInt(0, 365)
  const createdAt = new Date()
  createdAt.setDate(createdAt.getDate() - daysAgo)

  return {
    title,
    description,
    tags: noteTags,
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
  }
}

async function generateTestNotes(userId: string, count = 1000) {
  dotenv.config({ path: '.env.local' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in .env.local (NEXT_PUBLIC_SUPABASE_URL + anon/service key)')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`🚀 Generating ${count} test notes for user ${userId}...`)

  const batchSize = 100
  const batches = Math.ceil(count / batchSize)
  let totalInserted = 0

  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * batchSize
    const batchEnd = Math.min((batch + 1) * batchSize, count)
    const batchCount = batchEnd - batchStart

    console.log(`📦 Batch ${batch + 1}/${batches}: Inserting ${batchCount} notes...`)

    const notes = Array.from({ length: batchCount }, (_, i) => ({
      ...generateNote(batchStart + i),
      user_id: userId,
    }))

    const { data, error } = await supabase.from('notes').insert(notes).select('id')

    if (error) {
      // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
      console.error(`❌ Error in batch ${batch + 1}:`, error.message)
      continue
    }

    totalInserted += data.length
    console.log(`✅ Batch ${batch + 1} complete: ${data.length} notes inserted`)
  }

  console.log(`\n🎉 Done! Total notes inserted: ${totalInserted}/${count}`)

  const { count: totalCount, error: countError } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!countError) {
    console.log(`📊 Total notes in database for user: ${totalCount}`)
  }
}

async function main() {
  const count = parseInt(process.argv[2] || '1000', 10)
  const userId = process.argv[3]

  if (!userId) {
    console.error('❌ Please provide target user ID as second argument.')
    console.log('Usage: node scripts/generate-test-notes.ts [count] [userId]')
    process.exit(1)
  }

  console.log(`👤 User ID: ${userId}`)
  console.log(`📝 Will generate: ${count} notes\n`)

  await generateTestNotes(userId, count)
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
