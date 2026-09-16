import { useEffect, useState } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Search,
  ArrowRight,
  Sparkles,
  Zap,
  Globe2,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useCareersStore } from '../../store/useCareersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthModal } from '../auth/AuthModal';
import { FooterSection } from '../landing/FooterSection';
import type { JobPosting } from '../../../../shared/types';

interface CareersPageProps {
  onNavigateJob: (slug: string) => void;
  onNavigateHome: () => void;
}

const DEPARTMENTS = ['All', 'Engineering', 'Product', 'Design', 'AI Research', 'Marketing', 'Operations'];
const WORKPLACE_TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On-site', value: 'onsite' },
];

export function CareersPage({ onNavigateJob, onNavigateHome }: CareersPageProps) {
  const { publicJobs, isPublicLoading, fetchPublicJobs } = useCareersStore();
  const { isAuthenticated, authModalMode, setAuthModalMode } = useAuthStore();

  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Update meta title and tags for /careers
    document.title = 'Careers — Join Scritur | AI Learning Operating System';
  }, []);

  useEffect(() => {
    fetchPublicJobs({
      department: selectedDept !== 'All' ? selectedDept : undefined,
      workplace_type: selectedWorkplace !== 'all' ? selectedWorkplace : undefined,
      search: searchQuery.trim() || undefined,
    });
  }, [selectedDept, selectedWorkplace, searchQuery, fetchPublicJobs]);

  const filteredJobs = publicJobs;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 group transition-transform focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">Scritur</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              <Sparkles size={12} />
              <span>We're Hiring</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
            {!isAuthenticated ? (
              <button
                onClick={() => setAuthModalMode('login')}
                className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={onNavigateHome}
                className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Open Workspace
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28 bg-gradient-to-b from-indigo-50/50 via-white to-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-indigo-100 text-indigo-700 text-xs font-medium shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Join the core team
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] mb-6">
            Help us build the <span className="text-indigo-600">AI Learning OS</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10">
            We are rethinking how humans acquire knowledge, practice skills, and master complex subjects. If you care deeply about software craft, AI systems, and education, join us.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-lg border border-gray-200/80 shadow-xs">
              <Globe2 size={16} className="text-indigo-600" />
              <span>Remote-first & Global</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-lg border border-gray-200/80 shadow-xs">
              <Zap size={16} className="text-amber-500" />
              <span>High Ownership & Autonomy</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-lg border border-gray-200/80 shadow-xs">
              <GraduationCap size={16} className="text-emerald-500" />
              <span>Dedicated Learning Budget</span>
            </div>
          </div>
        </div>
      </section>

      {/* Job Search & Filter Section */}
      <section id="open-roles" className="max-w-5xl mx-auto px-6 w-full -mt-6 mb-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by role title or keyword (e.g. AI, React, Systems)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Department Pills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Department</span>
              <span className="text-xs text-gray-500">
                {filteredJobs.length} open {filteredJobs.length === 1 ? 'position' : 'positions'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    selectedDept === dept
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Workplace Type Pills */}
            <div className="pt-2 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-medium text-gray-400 mr-2">Location Type:</span>
              {WORKPLACE_TYPES.map((wp) => (
                <button
                  key={wp.value}
                  onClick={() => setSelectedWorkplace(wp.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedWorkplace === wp.value
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {wp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job Listings List */}
        <div className="mt-8 space-y-4">
          {isPublicLoading ? (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Loading open positions...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Briefcase size={36} className="text-gray-400 mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">No open positions found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                We couldn't find any roles matching your current search criteria. Try clearing your filters or check back soon!
              </p>
              <button
                onClick={() => {
                  setSelectedDept('All');
                  setSelectedWorkplace('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={() => onNavigateJob(job.slug)} />
            ))
          )}
        </div>
      </section>

      {/* Values & Culture */}
      <section className="bg-gray-50/70 border-t border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
              How we work at Scritur
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              We operate like a small studio of ambitious builders. We value velocity, rigorous design, and profound user empathy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 font-bold">
                1
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Extreme Craft & Speed</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                We believe great software is made by small, high-density teams who ship relentlessly and care deeply about latency, ergonomics, and aesthetics.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 font-bold">
                2
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">First-Principles Learning</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                We build tools that we use ourselves daily. Everyone on the team is encouraged to master new domains, experiment with models, and think from scratch.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4 font-bold">
                3
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Outcome-Driven Autonomy</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                No bureaucracy, minimal meetings, and maximum trust. You own features end-to-end from technical architecture to production release.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />

      {authModalMode && (
        <AuthModal onClose={() => setAuthModalMode(null)} initialTab={authModalMode} />
      )}
    </div>
  );
}

function JobCard({ job, onSelect }: { job: JobPosting; onSelect: () => void }) {
  const workplaceLabel =
    job.workplace_type === 'remote' ? 'Remote' : job.workplace_type === 'hybrid' ? 'Hybrid' : 'On-site';

  const employmentTypeLabel =
    job.employment_type === 'full_time'
      ? 'Full-Time'
      : job.employment_type === 'part_time'
      ? 'Part-Time'
      : job.employment_type === 'contract'
      ? 'Contract'
      : 'Internship';

  return (
    <div
      onClick={onSelect}
      className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-6"
    >
      <div className="flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/60">
            {job.department}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
            {workplaceLabel}
          </span>
          <span className="text-xs font-medium text-gray-500">{employmentTypeLabel}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {job.title}
        </h3>

        {job.short_description && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{job.short_description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" />
            <span>{job.location || 'Remote'}</span>
          </div>
          {job.compensation_amount && (
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              <DollarSign size={14} className="text-emerald-600" />
              <span>{job.compensation_amount}</span>
            </div>
          )}
          {job.duration && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" />
              <span>{job.duration}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center sm:self-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 group-hover:bg-indigo-600 text-gray-700 group-hover:text-white rounded-xl text-sm font-semibold transition-all duration-200 border border-gray-200 group-hover:border-indigo-600"
        >
          <span>View Role</span>
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
