import { GoogleGenerativeAI } from '@google/generative-ai';
import { LocalIndex } from 'vectra';
import * as path from 'path';
import * as os from 'os';
import { config } from '../config';
import { chunkText } from '../utils/chunkText';
import { retry, sleep } from '../utils/retry';

const genAI = new GoogleGenerativeAI(config.googleApiKey);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' }); // fallback to 001 if 004 fails

// We will export a getter for the model to ensure we can catch and fallback, OR just rigidly use gemini-embedding-001
// Actually, since we know gemini-embedding-001 works perfectly for this API key, we will just use it directly!

const activeEmbeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// In-memory map of videoId → Vectra index
const vectorIndexes = new Map<string, LocalIndex>();

function getIndexPath(videoId: string): string {
  return path.join(os.tmpdir(), 'ytllm-vectors', videoId);
}

async function getOrCreateIndex(videoId: string): Promise<LocalIndex> {
  if (vectorIndexes.has(videoId)) {
    return vectorIndexes.get(videoId)!;
  }

  const index = new LocalIndex(getIndexPath(videoId));
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
  vectorIndexes.set(videoId, index);
  return index;
}

/**
 * Embeds a single text using gemini-embedding-001.
 */
async function embedText(text: string): Promise<number[]> {
  return retry(async () => {
    const result = await activeEmbeddingModel.embedContent(text);
    return result.embedding.values;
  });
}

/**
 * Indexes transcript chunks for a video.
 * Chunks are embedded and stored in Vectra.
 */
export async function indexTranscript(videoId: string, transcript: string): Promise<number> {
  const chunks = chunkText(transcript, config.chunkSize, config.chunkOverlap);
  console.log(`📦 Indexing ${chunks.length} chunks for video ${videoId}`);

  // Clear existing index if any
  if (vectorIndexes.has(videoId)) {
    vectorIndexes.delete(videoId);
  }

  const index = await getOrCreateIndex(videoId);

  // Process in batches
  for (let i = 0; i < chunks.length; i += config.embeddingBatchSize) {
    const batch = chunks.slice(i, i + config.embeddingBatchSize);

    for (let j = 0; j < batch.length; j++) {
      const chunkIndex = i + j;
      const embedding = await embedText(batch[j]);
      await index.insertItem({
        vector: embedding,
        metadata: {
          text: batch[j],
          chunkIndex,
        },
      });
    }

    // Delay between batches to respect rate limits
    if (i + config.embeddingBatchSize < chunks.length) {
      await sleep(config.embeddingBatchDelay);
    }
  }

  console.log(`✅ Indexed ${chunks.length} chunks for video ${videoId}`);
  return chunks.length;
}

/**
 * Retrieves the top-k most semantically similar chunks for a query.
 */
export async function retrieveRelevantChunks(videoId: string, query: string, topK = config.topKChunks): Promise<string[]> {
  const index = vectorIndexes.get(videoId);
  if (!index) {
    console.warn(`No vector index found for video ${videoId}`);
    return [];
  }

  const queryEmbedding = await embedText(query);
  const results = await index.queryItems(queryEmbedding, query, topK);

  return results.map((r) => r.item.metadata.text as string);
}

/**
 * Deletes the vector index for a video (cleanup).
 */
export function deleteIndex(videoId: string): void {
  vectorIndexes.delete(videoId);
}
