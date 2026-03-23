import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { generatePdf, generateDocx } from '../services/exportService';
import { sessionCache } from '../utils/sessionCache';
import type { Message } from '../../../shared/types';

const router = Router();

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
});

const exportSchema = z.object({
  videoId: z.string().min(1),
  format: z.enum(['pdf', 'docx']),
  includeTranscript: z.boolean().default(false),
  chatHistory: z.array(messageSchema).default([]),
});

router.post('/', validateBody(exportSchema), async (req: Request, res: Response): Promise<void> => {
  const { videoId, format, includeTranscript, chatHistory } = req.body as {
    videoId: string;
    format: 'pdf' | 'docx';
    includeTranscript: boolean;
    chatHistory: Message[];
  };

  const sessionData = sessionCache.get(videoId);
  if (!sessionData) {
    res.status(404).json({
      error: 'SESSION_NOT_FOUND',
      message: 'Video session not found. Please reload the video and try again.',
    });
    return;
  }

  try {
    const exportData = {
      videoId,
      title: sessionData.title,
      channelName: sessionData.channelName,
      duration: sessionData.duration,
      thumbnailUrl: sessionData.thumbnailUrl,
      summary: sessionData.summary,
      chatHistory,
      includeTranscript,
      transcript: includeTranscript ? sessionData.transcript : undefined,
    };

    if (format === 'pdf') {
      await generatePdf(exportData, res);
    } else {
      await generateDocx(exportData, res);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Export error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'EXPORT_FAILED',
        message: 'Failed to generate export file. Please try again.',
      });
    }
  }
});

export default router;
