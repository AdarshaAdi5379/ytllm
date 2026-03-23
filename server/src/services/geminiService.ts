import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { Response } from 'express';
import { config } from '../config';
import { retry } from '../utils/retry';
import type { Message } from '../../../shared/types';

const genAI = new GoogleGenerativeAI(config.googleApiKey);

export interface GeminiContext {
  systemPrompt: string;
  retrievedChunks: string[];
  chatSummary: string | null;
  recentMessages: Message[];
  question: string;
}

/**
 * Assembles the full context payload and streams the Gemini response as SSE.
 */
export async function streamChatResponse(context: GeminiContext, res: Response): Promise<void> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
    systemInstruction: context.systemPrompt,
  });

  // Build the context message
  let contextContent = '';

  if (context.retrievedChunks.length > 0) {
    contextContent += `\n\n[RELEVANT TRANSCRIPT SECTIONS]\n${context.retrievedChunks.map((c, i) => `[Section ${i + 1}]: ${c}`).join('\n\n')}`;
  }

  if (context.chatSummary) {
    contextContent += `\n\n[PREVIOUS CONVERSATION SUMMARY]\n${context.chatSummary}`;
  }

  // Build conversation history for Gemini
  const history: Content[] = [];

  for (const msg of context.recentMessages) {
    history.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  const chat = model.startChat({ history });

  // Compose the final user message with context
  const userMessage = contextContent
    ? `${context.question}\n${contextContent}`
    : context.question;

  // Stream the response
  const stream = await retry(() => chat.sendMessageStream(userMessage));

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) {
      res.write(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
}

/**
 * Generates a 150-word summary of the transcript.
 */
export async function generateTranscriptSummary(transcript: string, title: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
  });

  // Use first ~8000 chars to avoid token limits for very long transcripts
  const truncated = transcript.slice(0, 8000);

  const prompt = `You are summarising a YouTube video titled "${title}". 
Write a concise 150-word summary of the following transcript that captures the main topics, key points, and conclusions. 
Be informative and neutral in tone.

Transcript:
${truncated}`;

  const result = await retry(() => model.generateContent(prompt));
  return result.response.text().trim();
}

/**
 * Generates 5 suggested starter questions about the video.
 */
export async function generateSuggestedQuestions(
  transcript: string,
  title: string
): Promise<string[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
  });

  const truncated = transcript.slice(0, 4000);

  const prompt = `You are helping a user explore a YouTube video titled "${title}".
Generate exactly 5 insightful, specific questions a viewer might ask about this video's content.
Questions should be diverse — covering different aspects of the content.
Return ONLY the 5 questions, one per line, without numbering or bullet points.

Transcript excerpt:
${truncated}`;

  const result = await retry(() => model.generateContent(prompt));
  const text = result.response.text().trim();
  const questions = text
    .split('\n')
    .map((q) => q.trim())
    .filter((q) => q.length > 10)
    .slice(0, 5);

  return questions;
}

/**
 * Builds the system prompt for a video session.
 */
export function buildSystemPrompt(
  title: string,
  channelName: string,
  duration: string,
  summary: string
): string {
  return `You are an AI assistant helping a user understand a YouTube video.

VIDEO INFORMATION:
- Title: ${title}
- Channel: ${channelName}
- Duration: ${duration}
- Summary: ${summary}

STRICT RULES:
1. Answer ONLY based on the provided transcript context sections. 
2. If the answer is not in the transcript, say clearly: "This information isn't covered in the video."
3. Do NOT use outside knowledge or speculation.
4. Be concise and direct. Use bullet points for lists.
5. When referencing specific information, mention which part of the video it comes from if possible.
6. You are discussing THIS specific video only.`;
}
