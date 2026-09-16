import { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  Download,
  FileText,
  Calendar,
  Briefcase,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { JobApplication, ApplicationStatus } from '../../../../shared/types';
import { useCareersStore } from '../../store/useCareersStore';
import { getAdminResumeDownloadUrl } from '../../api/careers';

interface ApplicationDetailModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { label: string; value: ApplicationStatus; color: string }[] = [
  { label: 'New', value: 'new', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Reviewing', value: 'reviewing', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Shortlisted', value: 'shortlisted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Interview', value: 'interview', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Hired', value: 'hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Rejected', value: 'rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export function ApplicationDetailModal({ application, isOpen, onClose }: ApplicationDetailModalProps) {
  const { setApplicationStatus } = useCareersStore();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !application) return null;

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setIsUpdating(true);
    try {
      await setApplicationStatus(application.id, newStatus);
      toast.success(`Application marked as ${newStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const isDownloadable = application.resume && !application.resume.startsWith('http');
  const resumeUrl = isDownloadable
    ? getAdminResumeDownloadUrl(application.id)
    : application.resume;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full my-8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
              {application.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{application.name}</h2>
              <p className="text-xs text-gray-500">
                Applied for{' '}
                <span className="font-semibold text-gray-700">
                  {application.job_title || 'Position'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Status Bar */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-gray-500 block mb-1">Application Pipeline Status</span>
              <div className="flex items-center gap-2">
                <select
                  disabled={isUpdating}
                  value={application.status}
                  onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isUpdating && <span className="text-xs text-gray-400">Updating...</span>}
              </div>
            </div>

            <div className="text-right text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Applied on {new Date(application.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Mail size={16} className="text-indigo-600" />
                <a
                  href={`mailto:${application.email}`}
                  className="font-medium text-gray-800 hover:text-indigo-600 transition-colors truncate"
                >
                  {application.email}
                </a>
              </div>

              {application.phone ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Phone size={16} className="text-indigo-600" />
                  <span className="font-medium text-gray-800">{application.phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-400">
                  <Phone size={16} />
                  <span>No phone provided</span>
                </div>
              )}
            </div>
          </div>

          {/* Resume & Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Candidate Materials</h3>
            <div className="flex flex-wrap items-center gap-3">
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={isDownloadable}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200/60 transition-colors"
                >
                  <Download size={14} />
                  <span>Download / View Resume</span>
                </a>
              ) : (
                <span className="text-xs text-gray-400">No resume file attached</span>
              )}

              {application.linkedin_url && (
                <a
                  href={application.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-medium transition-colors"
                >
                  <Linkedin size={14} className="text-blue-600" />
                  <span>LinkedIn</span>
                </a>
              )}

              {application.github_url && (
                <a
                  href={application.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-medium transition-colors"
                >
                  <Github size={14} />
                  <span>GitHub</span>
                </a>
              )}

              {application.portfolio_url && (
                <a
                  href={application.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-medium transition-colors"
                >
                  <Globe size={14} className="text-emerald-600" />
                  <span>Portfolio</span>
                </a>
              )}
            </div>
          </div>

          {/* Cover Note */}
          {application.cover_letter && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Cover Note / Message
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {application.cover_letter}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Close
          </button>

          <a
            href={`mailto:${application.email}?subject=Regarding your application for ${application.job_title || 'Role'} at Scritur`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Send Email
          </a>
        </div>
      </div>
    </div>
  );
}
