import { cn } from '../../utils/cn';
import type { Message } from '../../../../shared/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

function renderMarkdown(text: string): string {
  // Simple markdown rendering: bold, code, bullets
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^• /gm, '&bull; ')
    .replace(/^- /gm, '&bull; ');
}

export function AIMessage({ message, isStreaming }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="text-xs font-medium text-gray-500">AI Assistant</span>
        </div>

        <div
          className={cn(
            'bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm',
            isStreaming && 'streaming-cursor'
          )}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
        {!isStreaming && (
          <p className="text-xs text-gray-400 ml-1 mt-1">{time}</p>
        )}
      </div>
    </div>
  );
}
