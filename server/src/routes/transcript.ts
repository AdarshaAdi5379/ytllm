import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { extractVideoId } from '../utils/youtubeParser';
import { fetchTranscript, fetchVideoMetadata } from '../services/transcriptService';
import { indexTranscript } from '../services/embeddingService';
import { generateTranscriptSummary, generateSuggestedQuestions, buildSystemPrompt } from '../services/geminiService';
import { sessionCache } from '../utils/sessionCache';
import { config } from '../config';

const router = Router();

const transcriptSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

router.post('/', validateBody(transcriptSchema), async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url: string };

  // Extract video ID
  const videoId = extractVideoId(url);
  if (!videoId) {
    res.status(422).json({
      error: 'INVALID_URL',
      message: 'Could not extract a valid YouTube video ID from the provided URL.',
    });
    return;
  }

  try {
    // Fetch video metadata and transcript concurrently
    const [metadata, transcriptResult] = await Promise.all([
      fetchVideoMetadata(videoId),
      fetchTranscript(videoId),
    ]);

    const { text: transcript } = transcriptResult;

    // Generate summary and suggested questions concurrently
    const [summary, suggestedQuestions] = await Promise.all([
      generateTranscriptSummary(transcript, metadata.title),
      generateSuggestedQuestions(transcript, metadata.title),
    ]);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      metadata.title,
      metadata.channelName,
      metadata.duration,
      summary
    );

    // Index transcript chunks for semantic search
    const chunkCount = await indexTranscript(videoId, transcript);

    // Store session data for export
    sessionCache.set(videoId, {
      videoId,
      transcript,
      title: metadata.title,
      channelName: metadata.channelName,
      duration: metadata.duration,
      thumbnailUrl: metadata.thumbnailUrl,
      summary,
    });

    res.json({
      videoId,
      title: metadata.title,
      channelName: metadata.channelName,
      duration: metadata.duration,
      thumbnailUrl: metadata.thumbnailUrl,
      transcript,
      summary,
      suggestedQuestions,
      systemPrompt,
      chunkCount,
    });
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error('Transcript fetch error:', error.message);

    if (error.code === 'NO_CAPTIONS') {
      res.status(422).json({
        error: 'NO_CAPTIONS',
        message: 'This video has no available captions. Only videos with auto-generated or manual captions are supported.',
      });
      return;
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: 'Daily YouTube API quota reached. Please try again tomorrow.',
      });
      return;
    }

    if (
      error.message?.toLowerCase().includes('api key') ||
      (error as any)?.response?.status === 400 ||
      error.message?.includes('400 Bad Request')
    ) {
      if (config.googleApiKey === 'your_google_api_key_here' || !config.googleApiKey) {
        res.status(401).json({
          error: 'INVALID_API_KEY',
          message: 'Google API key is missing or invalid. Please set a valid GOOGLE_API_KEY in the server/.env file.',
        });
        return;
      }
    }

    if (error.message?.includes('403 Forbidden') || error.message?.includes('disabled') || error.message?.includes('SERVICE_DISABLED')) {
      res.status(403).json({
        error: 'API_DISABLED',
        message: 'The Generative Language API is disabled for your Google API key. Please click the link in your Google Cloud Console to enable it.',
      });
      return;
    }

    res.status(503).json({
      error: 'FETCH_FAILED',
      message: 'Failed to fetch video information. Please check the URL and try again.',
    });
  }
});

export default router;
