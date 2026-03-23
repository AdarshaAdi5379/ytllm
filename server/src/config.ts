import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  googleApiKey: parsed.data.GOOGLE_API_KEY,
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  corsOrigin: parsed.data.CORS_ORIGIN,
  // Memory settings
  chatHistoryThreshold: 10,
  chatWindowSize: 10,
  maxTokensInWindow: 2000,
  // Embedding settings
  chunkSize: 500,
  chunkOverlap: 50,
  topKChunks: 5,
  embeddingBatchSize: 20,
  embeddingBatchDelay: 500,
  // Cache settings
  sessionCacheTtl: 7200, // 2 hours in seconds
  // Rate limits
  requestsPerMinute: 30,
};
