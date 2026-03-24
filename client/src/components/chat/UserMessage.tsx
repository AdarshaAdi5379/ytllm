import type { Message } from '../../../../shared/types';

interface Props {
  message: Message;
}

export function UserMessage({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-end group">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-0.5">
          {message.content}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">You</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-[10px] font-medium text-slate-400">{time}</span>
        </div>
      </div>
    </div>
  );
}
