import 'dotenv/config'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { supabase } from './lib/supabase'
import { embeddings } from './lib/embeddings'
import { RAG_CONFIG } from './config'

const userId = process.env.RAG_USER_ID
if (!userId) throw new Error('Missing RAG_USER_ID in .env')

const question = process.argv[2]
if (!question) {
  console.error('Usage: npx ts-node query.ts "Your question here"')
  process.exit(1)
}

interface MatchResult {
  note_id: string
  content: string
  similarity: number
}

async function main() {
  console.log(`\nВопрос: ${question}\n`)

  // Embed the question
  const queryVector = await embeddings.embedQuery(question)

  // Similarity search via Supabase RPC
  const { data, error } = await supabase.rpc('match_notes', {
    query_embedding: queryVector,
    match_user_id: userId,
    match_count: RAG_CONFIG.matchCount,
  })

  if (error) throw new Error(`Similarity search failed: ${error.message}`)

  const matches = (data as MatchResult[]) ?? []

  if (matches.length === 0) {
    console.log('По вашим заметкам ответа не найдено.')
    return
  }

  // Fetch note titles for source display
  const noteIds = matches.map(m => m.note_id)
  const { data: noteTitles } = await supabase
    .from('notes')
    .select('id, title')
    .in('id', noteIds)

  const titleMap = Object.fromEntries((noteTitles ?? []).map(n => [n.id, n.title]))

  // Build context from matched notes
  const context = matches
    .map((m, i) => `[Заметка ${i + 1}: ${titleMap[m.note_id] ?? 'Untitled'}]\n${m.content}`)
    .join('\n\n---\n\n')

  // Generate answer with Gemini LLM
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genai.getGenerativeModel({
    model: RAG_CONFIG.llmModel,
    generationConfig: { temperature: RAG_CONFIG.llmTemperature },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  })

  const prompt = `Ты — помощник, который отвечает на вопросы по личным заметкам пользователя.

Контекст из заметок:
---
${context}
---

Вопрос: ${question}

Отвечай на основе предоставленных заметок. Если информации недостаточно, честно скажи об этом.`

  const result = await model.generateContent(prompt)
  const answer = result.response.text()

  console.log('Ответ:')
  console.log(answer)
  console.log('\nИсточники:')
  matches.forEach(m => {
    const title = titleMap[m.note_id] ?? 'Untitled'
    console.log(`  - "${title}" (similarity: ${m.similarity.toFixed(3)})`)
  })
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
