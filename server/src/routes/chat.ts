import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { retrieveRelevantChunks } from '../services/embeddingService';
import { processHistory } from '../services/memoryService';
import { streamChatResponse } from '../services/geminiService';
import type { Message } from '../../../shared/types';

const router = Router();

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
});

const chatSchema = z.object({
  videoId: z.string().min(1),
  question: z.string().min(1, 'Question cannot be empty'),
  chatHistory: z.array(messageSchema).default([]),
  systemPrompt: z.string().default(''),
});

router.post('/', validateBody(chatSchema), async (req: Request, res: Response): Promise<void> => {
  const { videoId, question, chatHistory, systemPrompt } = req.body as {
    videoId: string;
    question: string;
    chatHistory: Message[];
    systemPrompt: string;
  };

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // 1. Retrieve relevant transcript chunks
    const retrievedChunks = await retrieveRelevantChunks(videoId, question);

    // 2. Process chat history (rolling summary if needed)
    const { messages: recentMessages, summary: chatSummary } = await processHistory(
      chatHistory,
      null
    );

    // 3. Stream Gemini response
    await streamChatResponse(
      {
        systemPrompt,
        retrievedChunks,
        chatSummary,
        recentMessages,
        question,
      },
      res
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Chat error:', error.message);
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response. Please try again.' })}\n\n`
    );
  } finally {
    res.end();
  }
});

export default router;
