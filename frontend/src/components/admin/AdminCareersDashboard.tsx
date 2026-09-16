import { useEffect, useState } from 'react';
import {
  Briefcase,
  Users,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Archive,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  ArrowLeft,
  Filter,
  FileText,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCareersStore } from '../../store/useCareersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { JobEditorModal } from './JobEditorModal';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import type { JobPosting, JobApplication, JobStatus, ApplicationStatus } from '../../../../shared/types';

interface AdminCareersDashboardProps {
  onNavigateHome: () => void;
  onViewPublicCareers: () => void;
  onViewJobDetail: (slug: string) => void;
}

export function AdminCareersDashboard({
  onNavigateHome,
  onViewPublicCareers,
  onViewJobDetail,
}: AdminCareersDashboardProps) {
  const {
    adminJobs,
    adminApplications,
    isAdminLoading,
    adminError,
    fetchAdminJobs,
    fetchAdminApplications,
    setJobStatus,
    deleteJob,
  } = useCareersStore();

  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [jobSearch, setJobSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');
  const [appJobFilter, setAppJobFilter] = useState<string>('all');
  const [appSearch, setAppSearch] = useState('');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [isAppDetailOpen, setIsAppDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  useEffect(() => {
    document.title = 'Scritur Admin — Careers & Job Management';
    fetchAdminJobs();
    fetchAdminApplications();
  }, [fetchAdminJobs, fetchAdminApplications]);

  // Refetch when filters change
  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchAdminJobs({
        status: jobStatusFilter !== 'all' ? jobStatusFilter : undefined,
        search: jobSearch.trim() || undefined,
      });
    } else {
      fetchAdminApplications({
        job_id: appJobFilter !== 'all' ? appJobFilter : undefined,
        status: appStatusFilter !== 'all' ? appStatusFilter : undefined,
        search: appSearch.trim() || undefined,
      });
    }
  }, [activeTab, jobStatusFilter, jobSearch, appJobFilter, appStatusFilter, appSearch, fetchAdminJobs, fetchAdminApplications]);

  const handleCreateNew = () => {
    setEditingJob(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job);
    setIsEditorOpen(true);
  };

  const handleDelete = async (job: JobPosting) => {
    if (window.confirm(`Are you sure you want to delete "${job.title}" and all its candidate applications?`)) {
      try {
        await deleteJob(job.id);
        toast.success(`Job "${job.title}" deleted.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete job';
        toast.error(msg);
      }
    }
  };

  const handleQuickStatusChange = async (job: JobPosting, newStatus: JobStatus) => {
    try {
      await setJobStatus(job.id, newStatus);
      toast.success(`Job status changed to ${newStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(msg);
    }
  };

  const totalPublished = adminJobs.filter((j) => j.status === 'published').length;
  const totalDrafts = adminJobs.filter((j) => j.status === 'draft').length;
  const totalClosed = adminJobs.filter((j) => j.status === 'closed').length;
  const newApplicationsCount = adminApplications.filter((a) => a.status === 'new').length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onNavigateHome} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-base text-gray-900">Scritur Admin</span>
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              Careers CMS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onViewPublicCareers}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white transition-all shadow-2xs"
            >
              <ExternalLink size={14} />
              <span>Public /careers</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Back to App
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Positions</span>
              <Briefcase size={18} className="text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">{adminJobs.length}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="text-emerald-600 font-semibold">{totalPublished} active</span>
              <span>•</span>
              <span>{totalDrafts} drafts</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Published</span>
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">{totalPublished}</p>
            <p className="mt-2 text-xs text-gray-500">Live on public portal</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Applications</span>
              <Users size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">{adminApplications.length}</p>
            <p className="mt-2 text-xs text-gray-500">Across all job postings</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New In Review</span>
              <TrendingUp size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600">{newApplicationsCount}</p>
            <p className="mt-2 text-xs text-gray-500">Awaiting recruiter review</p>
          </div>
        </div>

        {/* Tabs Bar & Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'jobs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Briefcase size={15} />
                <span>Job Openings ({adminJobs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'applications'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users size={15} />
                <span>Candidate Applications ({adminApplications.length})</span>
                {newApplicationsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>

            {activeTab === 'jobs' && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Plus size={16} />
                <span>Create Job Opening</span>
              </button>
            )}
          </div>

          {/* TAB 1: JOBS MANAGEMENT */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title or slug..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  {['all', 'published', 'draft', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setJobStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        jobStatusFilter === st
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jobs Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Position Title</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Applications</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium">
                    {isAdminLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Loading positions...
                        </td>
                      </tr>
                    ) : adminJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No jobs found. Click "Create Job Opening" to add your first position.
                        </td>
                      </tr>
                    ) : (
                      adminJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{job.title}</div>
                            <div className="text-gray-400 font-mono text-[11px]">/careers/{job.slug}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold">
                              {job.department}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-gray-600">
                            {job.location} ({job.workplace_type})
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                                job.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : job.status === 'draft'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {job.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                setAppJobFilter(job.id);
                                setActiveTab('applications');
                              }}
                              className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              <Users size={14} />
                              <span>{job.application_count || 0} candidates</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {job.status === 'published' ? (
                                <>
                                  <button
                                    onClick={() => onViewJobDetail(job.slug)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="View Live Page"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(job, 'closed')}
                                    className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  >
                                    Close
                                  </button>
                                </>
                              ) : job.status === 'draft' ? (
                                <button
                                  onClick={() => handleQuickStatusChange(job, 'published')}
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  Publish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleQuickStatusChange(job, 'published')}
                                  className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                  Re-open
                                </button>
                              )}

                              <button
                                onClick={() => handleEdit(job)}
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit Job"
                              >
                                <Edit size={15} />
                              </button>

                              <button
                                onClick={() => handleDelete(job)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Job"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: APPLICATIONS HUB */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search candidate name/email..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={appJobFilter}
                    onChange={(e) => setAppJobFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Job Openings</option>
                    {adminJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  {['all', 'new', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setAppStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        appStatusFilter === st
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Candidate</th>
                      <th className="py-3.5 px-4">Position</th>
                      <th className="py-3.5 px-4">Applied Date</th>
                      <th className="py-3.5 px-4">Pipeline Status</th>
                      <th className="py-3.5 px-4 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium">
                    {isAdminLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Loading applications...
                        </td>
                      </tr>
                    ) : adminApplications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No candidate applications matching your filters.
                        </td>
                      </tr>
                    ) : (
                      adminApplications.map((app) => (
                        <tr
                          key={app.id}
                          onClick={() => {
                            setSelectedApp(app);
                            setIsAppDetailOpen(true);
                          }}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{app.name}</div>
                            <div className="text-gray-500 text-[11px]">{app.email}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800">
                              {app.job_title || 'General Application'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-gray-500">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                                app.status === 'new'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : app.status === 'interview'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : app.status === 'hired'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : app.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                                setIsAppDetailOpen(true);
                              }}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold text-gray-700 transition-colors inline-flex items-center gap-1"
                            >
                              <span>Review</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <JobEditorModal
        job={editingJob}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />

      <ApplicationDetailModal
        application={selectedApp}
        isOpen={isAppDetailOpen}
        onClose={() => setIsAppDetailOpen(false)}
      />
    </div>
  );
}
