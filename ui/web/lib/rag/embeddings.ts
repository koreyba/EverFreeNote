const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const EMBEDDING_MODEL = 'models/gemini-embedding-001'
const OUTPUT_DIMENSIONS = 1536

interface BatchEmbedResponse {
  embeddings: Array<{ values: number[] }>
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const requests = texts.map(text => ({
    model: EMBEDDING_MODEL,
    content: { parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: OUTPUT_DIMENSIONS,
  }))

  const response = await fetch(
    `${GEMINI_API_BASE}/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini batchEmbedContents failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as BatchEmbedResponse
  return data.embeddings.map(e => e.values)
}
