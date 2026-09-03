import { useRef, useState, KeyboardEvent } from 'react';
import { Send, Command } from 'lucide-react';

interface Props {
  videoId: string;
  onSend: (question: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="relative flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-2.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/30 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'AI is processing...' : 'Ask a question about this video...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] text-slate-700 placeholder-slate-400 outline-none px-2 py-1.5 min-h-[24px] max-h-[160px] leading-6 disabled:opacity-60"
          aria-label="Chat input"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 min-h-[44px] min-w-[44px] w-9 h-9 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400">
          <Command size={10} />
          <span>Enter</span>
        </div>
        <p className="text-[10px] text-slate-400">
          {disabled ? 'Thinking...' : 'to send'}
        </p>
      </div>
    </div>
  );
}
