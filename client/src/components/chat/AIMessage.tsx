import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Message } from '../../../../shared/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-100/50">$1</code>')
    .replace(/^• (.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 mb-1">$1</li>')
    .split('\n\n').map(p => p.startsWith('<li') ? `<ul class="space-y-1 mb-4">${p}</ul>` : `<p class="mb-4 last:mb-0">${p}</p>`).join('');
}

export function AIMessage({ message, isStreaming }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-start group">
      <div className="max-w-[85%] flex flex-col items-start">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={14} className="text-indigo-600" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">AI Assistant</span>
        </div>

        <div
          className={cn(
            'bg-slate-50/50 border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 text-[14px] leading-relaxed text-slate-700 hover:border-slate-200 transition-colors duration-300',
            isStreaming && 'streaming-cursor'
          )}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        
        {!isStreaming && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] font-medium text-slate-400">{time}</span>
          </div>
        )}
      </div>
    </div>
  );
}
