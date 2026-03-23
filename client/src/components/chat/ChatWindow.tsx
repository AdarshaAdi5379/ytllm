import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';

interface Props {
  videoId: string;
}

export function ChatWindow({ videoId }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [video?.chatHistory.length, video?.isStreaming]);

  if (!video) return null;

  const messages = video.chatHistory;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
          <MessageSquare size={40} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium">Ask anything about this video</p>
          <p className="text-xs mt-1">Use the suggested questions above or type your own</p>
        </div>
      ) : (
        messages.map((msg, i) => {
          const isLastAI = msg.role === 'assistant' && i === messages.length - 1;
          const isStreaming = isLastAI && video.isStreaming;

          return msg.role === 'user' ? (
            <UserMessage key={i} message={msg} />
          ) : (
            <AIMessage key={i} message={msg} isStreaming={isStreaming} />
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
