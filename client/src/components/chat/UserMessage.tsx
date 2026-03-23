import type { Message } from '../../../../shared/types';

interface Props {
  message: Message;
}

export function UserMessage({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>
        <p className="text-xs text-gray-400 text-right mt-1 mr-1">{time}</p>
      </div>
    </div>
  );
}
