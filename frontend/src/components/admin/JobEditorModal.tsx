import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Globe, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import type { JobPosting, JobStatus, EmploymentType, WorkplaceType } from '../../../../shared/types';
import { useCareersStore } from '../../store/useCareersStore';

interface JobEditorModalProps {
  job: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'AI Research', 'Marketing', 'Operations', 'Sales', 'Other'];

export function JobEditorModal({ job, isOpen, onClose }: JobEditorModalProps) {
  const { createJob, editJob } = useCareersStore();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('remote');
  const [location, setLocation] = useState('Remote');
  const [duration, setDuration] = useState('');
  const [compensationType, setCompensationType] = useState('Salary');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [niceToHave, setNiceToHave] = useState('');
  const [whatYouWillLearn, setWhatYouWillLearn] = useState('');
  const [benefits, setBenefits] = useState('');
  const [applicationMethod, setApplicationMethod] = useState<'internal' | 'external'>('internal');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [status, setStatus] = useState<JobStatus>('draft');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'settings'>('details');

  useEffect(() => {
    if (job) {
      setTitle(job.title || '');
      setSlug(job.slug || '');
      setDepartment(job.department || 'Engineering');
      setEmploymentType(job.employment_type || 'full_time');
      setWorkplaceType(job.workplace_type || 'remote');
      setLocation(job.location || 'Remote');
      setDuration(job.duration || '');
      setCompensationType(job.compensation_type || 'Salary');
      setCompensationAmount(job.compensation_amount || '');
      setShortDescription(job.short_description || '');
      setDescription(job.description || '');
      setResponsibilities(job.responsibilities || '');
      setRequirements(job.requirements || '');
      setNiceToHave(job.nice_to_have || '');
      setWhatYouWillLearn(job.what_you_will_learn || '');
      setBenefits(job.benefits || '');
      setApplicationMethod(job.application_method || 'internal');
      setApplicationUrl(job.application_url || '');
      setStatus(job.status || 'draft');
      setExpiresAt(job.expires_at ? job.expires_at.substring(0, 10) : '');
    } else {
      // Reset form
      setTitle('');
      setSlug('');
      setDepartment('Engineering');
      setEmploymentType('full_time');
      setWorkplaceType('remote');
      setLocation('Remote');
      setDuration('');
      setCompensationType('Salary');
      setCompensationAmount('');
      setShortDescription('');
      setDescription('');
      setResponsibilities('');
      setRequirements('');
      setNiceToHave('');
      setWhatYouWillLearn('');
      setBenefits('');
      setApplicationMethod('internal');
      setApplicationUrl('');
      setStatus('draft');
      setExpiresAt('');
    }
  }, [job, isOpen]);

  // Auto-generate slug when title changes (if creating new job)
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!job) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (submitStatus?: JobStatus) => {
    if (!title.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Job description is required');
      return;
    }

    const payloadStatus = submitStatus || status;

    const payload: Partial<JobPosting> = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      department: department.trim(),
      employment_type: employmentType,
      workplace_type: workplaceType,
      location: location.trim() || 'Remote',
      duration: duration.trim() || null,
      compensation_type: compensationType.trim() || null,
      compensation_amount: compensationAmount.trim() || null,
      short_description: shortDescription.trim(),
      description: description.trim(),
      responsibilities: responsibilities.trim(),
      requirements: requirements.trim(),
      nice_to_have: niceToHave.trim(),
      what_you_will_learn: whatYouWillLearn.trim(),
      benefits: benefits.trim(),
      application_method: applicationMethod,
      application_url: applicationUrl.trim() || null,
      status: payloadStatus,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    setIsSaving(true);
    try {
      if (job) {
        await editJob(job.id, payload);
        toast.success(`Job "${payload.title}" updated!`);
      } else {
        await createJob(payload);
        toast.success(`Job "${payload.title}" created as ${payloadStatus}!`);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save job';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {job ? `Edit Job: ${job.title}` : 'Create New Job Opening'}
            </h2>
            <p className="text-xs text-gray-500">
              Manage all position specs, description, compensation, and publication status.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6 gap-6 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            1. Role Description & Overview
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            2. Requirements & What You'll Learn
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            3. Compensation & Status Settings
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior AI Research Engineer"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    URL Slug <span className="text-rose-500">*</span> (/careers/...)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="senior-ai-engineer"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Workplace Type</label>
                  <select
                    value={workplaceType}
                    onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="full_time">Full-Time</option>
                    <option value="part_time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location (Display)</label>
                  <input
                    type="text"
                    placeholder="e.g. Remote (Worldwide) or San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duration (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Permanent, 6 Months, or Indefinite"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Short Summary / Card Snippet
                </label>
                <input
                  type="text"
                  placeholder="One sentence TL;DR shown on role cards (e.g. Build low-latency RAG pipelines and vector intelligence systems.)"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Detailed Job Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Describe the mission, the problem space, and the team context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  What You'll Do / Key Responsibilities
                </label>
                <textarea
                  rows={5}
                  placeholder="- Lead development of multi-source memory systems&#10;- Optimize streaming SSE response latency&#10;- Collaborate directly with founders"
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Requirements & Qualifications
                </label>
                <textarea
                  rows={6}
                  placeholder="- 4+ years of professional engineering experience with Python / TypeScript&#10;- Strong knowledge of vector databases (Chroma, pgvector) and LLMs&#10;- Obsession with fast response times and code modularity"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nice to Have / Bonus Points
                </label>
                <textarea
                  rows={4}
                  placeholder="- Experience building spaced repetition systems (Anki / SM-2)&#10;- Open source contributions or technical writing"
                  value={niceToHave}
                  onChange={(e) => setNiceToHave(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  What You Will Learn & Grow Into
                </label>
                <textarea
                  rows={4}
                  placeholder="- Production scaling of agentic memory architectures&#10;- Real-time audio transcription and multimodal RAG pipelines"
                  value={whatYouWillLearn}
                  onChange={(e) => setWhatYouWillLearn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Benefits & Perks
                </label>
                <textarea
                  rows={4}
                  placeholder="- Competitive base salary + high-upside equity&#10;- 100% remote flexibility & home office stipend&#10;- Annual $2,500 learning budget for books, courses, and conferences"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Compensation Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Salary, Hourly, Equity, Stipend"
                    value={compensationType}
                    onChange={(e) => setCompensationType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Compensation Range</label>
                  <input
                    type="text"
                    placeholder="e.g. $130,000 - $170,000 / year + Equity"
                    value={compensationAmount}
                    onChange={(e) => setCompensationAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Application Method</label>
                  <select
                    value={applicationMethod}
                    onChange={(e) => setApplicationMethod(e.target.value as 'internal' | 'external')}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="internal">Scritur In-App Form (Recommended)</option>
                    <option value="external">External ATS URL (Lever/Greenhouse)</option>
                  </select>
                </div>

                {applicationMethod === 'external' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">External Application URL</label>
                    <input
                      type="url"
                      placeholder="https://jobs.lever.co/scritur/..."
                      value={applicationUrl}
                      onChange={(e) => setApplicationUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Publication Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as JobStatus)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="draft">Draft (Hidden from public)</option>
                    <option value="published">Published (Live on /careers & sitemap)</option>
                    <option value="closed">Closed (No longer accepting candidates)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {status === 'draft' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSubmit('published')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                Publish Directly
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{job ? 'Update Job' : 'Save Job'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
