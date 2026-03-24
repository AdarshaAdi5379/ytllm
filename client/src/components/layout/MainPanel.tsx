import { useVideoStore } from '../../store/useVideoStore';
import { VideoHeader } from '../video/VideoHeader';
import { SummaryCard } from '../video/SummaryCard';
import { TranscriptPanel } from '../video/TranscriptPanel';
import { ChatWindow } from '../chat/ChatWindow';
import { ChatInput } from '../chat/ChatInput';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { useChat } from '../../hooks/useChat';

export function MainPanel() {
  const { videos, activeVideoId } = useVideoStore();
  const video = activeVideoId ? videos[activeVideoId] : null;
  const { sendMessage } = useChat(activeVideoId);

  if (!video) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No video selected</h2>
          <p className="text-sm">Add a YouTube video using the sidebar to get started.</p>
        </div>
      </main>
    );
  }

  if (video.status === 'loading') {
    return (
      <main className="flex-1 overflow-hidden">
        <LoadingSkeleton />
      </main>
    );
  }

  if (video.status === 'error') {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Failed to load video</h2>
          <p className="text-sm text-gray-500">{video.errorMessage || 'An error occurred while loading this video.'}</p>
        </div>
      </main>
    );
  }

  const handleSend = (question: string) => {
    sendMessage(question, video.chatHistory, video.systemPrompt);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-white">
      <VideoHeader videoId={video.videoId} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col relative bg-white">
          <ChatWindow videoId={video.videoId} />
          <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
            <ChatInput
              videoId={video.videoId}
              onSend={handleSend}
              disabled={video.isStreaming}
            />
          </div>
        </div>

        {/* Info Section (Right Sidebar) */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-slate-50/50 border-l border-slate-100 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-4">
            <SummaryCard videoId={video.videoId} onQuestionClick={handleSend} />
            <TranscriptPanel videoId={video.videoId} />
          </div>
        </div>
      </div>
    </main>
  );
}
