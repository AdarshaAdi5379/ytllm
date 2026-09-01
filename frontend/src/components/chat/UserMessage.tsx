import type { Message } from '../../../../shared/types';

interface Props {
  message: Message;
}

export function UserMessage({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-end group">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] font-medium text-slate-400">You</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-[10px] font-medium text-slate-400">{time}</span>
        </div>
      </div>
    </div>
  );
}
