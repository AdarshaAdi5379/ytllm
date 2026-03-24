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
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin relative">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {messages.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center h-full text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
            <MessageSquare size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2 uppercase tracking-tight">Ready to chat?</h3>
          <p className="text-sm font-medium text-slate-400 max-w-xs">
            Ask anything about this video or use the suggested questions in the sidebar.
          </p>
        </div>
      ) : (
        <div className="relative space-y-8">
          {messages.map((msg, i) => {
            const isLastAI = msg.role === 'assistant' && i === messages.length - 1;
            const isStreaming = isLastAI && video.isStreaming;

            return msg.role === 'user' ? (
              <UserMessage key={i} message={msg} />
            ) : (
              <AIMessage key={i} message={msg} isStreaming={isStreaming} />
            );
          })}
        </div>
      )}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
