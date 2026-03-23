import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { exportChat } from '../api/client';
import type { Message } from '../../../shared/types';

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const triggerExport = useCallback(
    async (
      videoId: string,
      format: 'pdf' | 'docx',
      includeTranscript: boolean,
      chatHistory: Message[],
      title: string
    ) => {
      setIsExporting(true);
      try {
        const blob = await exportChat({ videoId, format, includeTranscript, chatHistory });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.slice(0, 40).replace(/[^a-z0-9]/gi, '-')}-chat.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${format.toUpperCase()} exported successfully!`);
      } catch (err) {
        toast.error((err as Error).message || 'Export failed. Please try again.');
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { triggerExport, isExporting };
}
