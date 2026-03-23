import NodeCache from 'node-cache';
import { config } from '../config';

interface SessionData {
  transcript: string;
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  thumbnailUrl: string;
  summary: string;
}

const cache = new NodeCache({ stdTTL: config.sessionCacheTtl });

export const sessionCache = {
  set(videoId: string, data: SessionData): void {
    cache.set(videoId, data);
  },

  get(videoId: string): SessionData | undefined {
    return cache.get<SessionData>(videoId);
  },

  delete(videoId: string): void {
    cache.del(videoId);
  },

  has(videoId: string): boolean {
    return cache.has(videoId);
  },
};
