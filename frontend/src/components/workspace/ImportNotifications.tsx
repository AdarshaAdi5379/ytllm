import { Loader2, Check, X, AlertCircle, Youtube, Globe, FileText, Code } from 'lucide-react';
import { useImportStore } from '../../store/useImportStore';

const TYPE_ICONS: Record<string, JSX.Element> = {
  youtube_video: <Youtube size={12} className="text-red-400" />,
  website_page: <Globe size={12} className="text-emerald-400" />,
  pdf_document: <FileText size={12} className="text-rose-400" />,
  markdown_note: <Code size={12} className="text-amber-400" />,
  text_note: <FileText size={12} className="text-slate-400" />,
  docx_document: <FileText size={12} className="text-blue-400" />,
  pptx_document: <FileText size={12} className="text-orange-400" />,
};

export function ImportNotifications() {
  const { jobs, setJobFailed, dismissJob, clearDone } = useImportStore();
  const active = jobs.filter((j) => j.status === 'processing');
  const done = jobs.filter((j) => j.status === 'done');
  const failed = jobs.filter((j) => j.status === 'failed');

  if (jobs.length === 0) return null;

  return (
    <div className="px-3 py-2 space-y-1 border-t border-slate-800/50">
      {jobs.length > 3 && (
        <button onClick={clearDone} className="text-[10px] text-slate-500 hover:text-slate-300">
          Clear completed
        </button>
      )}
      {[...active, ...failed, ...done].slice(0, 5).map((job) => (
        <div
          key={job.id}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
            job.status === 'failed' ? 'bg-rose-900/20 text-rose-300' :
            job.status === 'done' ? 'bg-emerald-900/20 text-emerald-300' :
            'bg-slate-800/50 text-slate-300'
          }`}
        >
          <span className="flex-shrink-0">{TYPE_ICONS[job.sourceType] || <FileText size={12} className="text-slate-400" />}</span>
          <span className="flex-1 truncate">{job.title || 'Import'}</span>
          {job.status === 'processing' && <Loader2 size={11} className="animate-spin flex-shrink-0 text-indigo-400" />}
          {job.status === 'done' && <Check size={11} className="flex-shrink-0 text-emerald-400" />}
          {job.status === 'failed' && (
            <>
              <span title={job.error} className="flex-shrink-0"><AlertCircle size={11} className="text-rose-400" /></span>
              <button onClick={() => dismissJob(job.id)} className="p-0.5 flex-shrink-0 text-rose-400/50 hover:text-rose-300">
                <X size={10} />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
