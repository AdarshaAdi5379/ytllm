import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { retry } from '../utils/retry';
import type { Message } from '../../../shared/types';

const genAI = new GoogleGenerativeAI(config.googleApiKey);

/**
 * Summarises old messages in a conversation to keep context compact.
 */
export async function summariseChatHistory(oldMessages: Message[]): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
  });

  const historyText = oldMessages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `Summarise this conversation history concisely in 3-5 sentences, preserving key facts and decisions discussed:\n\n${historyText}`;

  const result = await retry(() => model.generateContent(prompt));
  return result.response.text();
}

/**
 * Checks if the chat history needs summarisation and returns the processed history.
 * Returns: { messages: recent messages, summary: summary of older messages or null }
 */
export async function processHistory(
  chatHistory: Message[],
  existingSummary: string | null
): Promise<{ messages: Message[]; summary: string | null }> {
  const threshold = config.chatHistoryThreshold;
  const windowSize = config.chatWindowSize;

  if (chatHistory.length <= threshold) {
    return { messages: chatHistory, summary: existingSummary };
  }

  // Split: older messages get summarised, last N messages stay as full context
  const olderMessages = chatHistory.slice(0, chatHistory.length - windowSize);
  const recentMessages = chatHistory.slice(chatHistory.length - windowSize);

  // Build summary from existing summary + older messages
  const messagesToSummarise = existingSummary
    ? [
        {
          role: 'assistant' as const,
          content: `[Previous conversation summary]: ${existingSummary}`,
          timestamp: new Date().toISOString(),
        },
        ...olderMessages,
      ]
    : olderMessages;

  const newSummary = await summariseChatHistory(messagesToSummarise);
  return { messages: recentMessages, summary: newSummary };
}
