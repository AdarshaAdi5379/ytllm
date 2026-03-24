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
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
        <div className="relative flex items-end gap-3 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl p-2.5 shadow-xl shadow-slate-200/50 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all duration-300">
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
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 disabled:opacity-40 disabled:scale-95 disabled:shadow-none hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group/btn"
            aria-label="Send message"
          >
            <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-tighter shadow-sm">
          <Command size={10} />
          <span>Enter</span>
        </div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
          {disabled ? 'Thinking...' : 'to send message'}
        </p>
      </div>
    </div>
  );
}
