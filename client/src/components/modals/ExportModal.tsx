import { useState } from 'react';
import { X, FileText, FileType } from 'lucide-react';
import { useVideoStore } from '../../store/useVideoStore';
import { useExport } from '../../hooks/useExport';

interface Props {
  videoId: string;
  onClose: () => void;
}

export function ExportModal({ videoId, onClose }: Props) {
  const video = useVideoStore((s) => s.videos[videoId]);
  const { triggerExport, isExporting } = useExport();
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [includeTranscript, setIncludeTranscript] = useState(false);

  if (!video) return null;

  const handleExport = async () => {
    await triggerExport(videoId, format, includeTranscript, video.chatHistory, video.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Export Conversation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Format selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Export format</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  format === 'pdf' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText size={20} className={format === 'pdf' ? 'text-brand-500' : 'text-gray-400'} />
                <span className="text-sm font-medium">PDF</span>
                <span className="text-xs text-gray-400">Best for sharing</span>
              </button>
              <button
                onClick={() => setFormat('docx')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  format === 'docx' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileType size={20} className={format === 'docx' ? 'text-brand-500' : 'text-gray-400'} />
                <span className="text-sm font-medium">DOCX</span>
                <span className="text-xs text-gray-400">Editable in Word</span>
              </button>
            </div>
          </div>

          {/* Include transcript toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Include full transcript</p>
              <p className="text-xs text-gray-400 mt-0.5">Appends transcript as an appendix</p>
            </div>
            <div
              onClick={() => setIncludeTranscript((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                includeTranscript ? 'bg-brand-500' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={includeTranscript}
              tabIndex={0}
              onKeyDown={(e) => e.key === ' ' && setIncludeTranscript((v) => !v)}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  includeTranscript ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </label>

          {/* Stats */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <p>{video.chatHistory.length} messages in this conversation</p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || video.chatHistory.length === 0}
            className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Generating...' : `Export as ${format.toUpperCase()}`}
          </button>
          {video.chatHistory.length === 0 && (
            <p className="text-xs text-center text-gray-400">Start a conversation first to export</p>
          )}
        </div>
      </div>
    </div>
  );
}
