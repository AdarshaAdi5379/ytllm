import { useState, FormEvent } from 'react';
import { X, Video } from 'lucide-react';
import { isValidYouTubeUrl } from '../../utils/youtubeParser';
import { useTranscript } from '../../hooks/useTranscript';
import { useVideoStore } from '../../store/useVideoStore';

export function URLInputModal() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const { mutate: loadTranscript, isPending } = useTranscript();
  const { closeAddVideoModal, videos } = useVideoStore();

  const hasVideos = Object.keys(videos).length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please enter a YouTube URL or video ID.');
      return;
    }

    if (!isValidYouTubeUrl(trimmed)) {
      setError('Invalid YouTube URL. Try formats like: youtube.com/watch?v=... or youtu.be/...');
      return;
    }

    setError('');
    loadTranscript(trimmed, {
      onSuccess: () => closeAddVideoModal(),
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (isValidYouTubeUrl(pasted)) {
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Video size={20} className="text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">Load YouTube Video</h2>
          </div>
          {hasVideos && (
            <button
              onClick={closeAddVideoModal}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label htmlFor="yt-url" className="block text-sm font-medium text-gray-700 mb-1.5">
              YouTube URL or Video ID
            </label>
            <input
              id="yt-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              onPaste={handlePaste}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              disabled={isPending}
              aria-describedby={error ? 'url-error' : undefined}
              autoFocus
            />
            {error && (
              <p id="url-error" className="mt-1.5 text-xs text-red-500" role="alert">
                {error}
              </p>
            )}
            <p className="mt-1.5 text-xs text-gray-400">
              Supports youtube.com, youtu.be, embed URLs, and bare video IDs
            </p>
          </div>

          {isPending && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-brand-500">Loading video...</p>
                <p className="text-xs text-gray-500 mt-0.5">Fetching transcript and generating AI context</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !url.trim()}
            className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Loading...' : 'Load Video'}
          </button>
        </form>
      </div>
    </div>
  );
}
