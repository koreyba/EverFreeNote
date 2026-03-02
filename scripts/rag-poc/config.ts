export const RAG_CONFIG = {
  // --- Embedding ---
  embeddingModel: 'models/gemini-embedding-001', // Gemini model for embeddings (768 dims)
  embeddingDimensions: 3072,            // Must match vector(3072) in DB

  // --- LLM ---
  llmModel: 'gemini-2.5-flash',         // Gemini model for answer generation
  llmTemperature: 0.2,                  // Low temperature = factual, less hallucination

  // --- Search ---
  matchCount: 3,                        // Number of notes to retrieve as context

  // --- Indexing ---
  batchSize: 10,                        // Notes per embedDocuments() call
  batchDelayMs: 200,                    // Delay between batches (Gemini free tier rate limit)
  maxContentChars: 500,                 // Truncate note content before embedding (POC: keep prompts small)

  // --- pgvector HNSW index (reference only — applied in migration) ---
  hnswM: 16,                            // Connections per node
  hnswEfConstruction: 64,               // Build accuracy
} as const
