import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { RAG_CONFIG } from '../config'
import 'dotenv/config'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in .env')
}

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  modelName: RAG_CONFIG.embeddingModel,
})
