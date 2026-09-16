import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  CheckCircle2,
  UploadCloud,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Share2,
  Building2,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCareersStore } from '../../store/useCareersStore';
import { FooterSection } from '../landing/FooterSection';
import type { JobPosting } from '../../../../shared/types';

interface JobDetailPageProps {
  slug: string;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
}

export function JobDetailPage({ slug, onNavigateBack, onNavigateHome }: JobDetailPageProps) {
  const { selectedJob, isPublicLoading, publicError, fetchPublicJobBySlug, applyToJob } = useCareersStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const applySectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchPublicJobBySlug(slug);
  }, [slug, fetchPublicJobBySlug]);

  useEffect(() => {
    if (selectedJob) {
      document.title = `${selectedJob.title} — Careers at Scritur`;
    }
  }, [selectedJob]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File exceeds maximum size of 10MB');
        return;
      }
      setResumeFile(file);
      setFormError(null);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!resumeFile && !resumeUrl.trim()) {
      setFormError('Please upload a resume file (PDF/DOCX) or provide a resume link.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('email', email.trim());
    if (phone.trim()) formData.append('phone', phone.trim());
    if (githubUrl.trim()) formData.append('github_url', githubUrl.trim());
    if (linkedinUrl.trim()) formData.append('linkedin_url', linkedinUrl.trim());
    if (portfolioUrl.trim()) formData.append('portfolio_url', portfolioUrl.trim());
    if (coverLetter.trim()) formData.append('cover_letter', coverLetter.trim());

    if (resumeFile) {
      formData.append('resume_file', resumeFile);
    } else if (resumeUrl.trim()) {
      formData.append('resume_url', resumeUrl.trim());
    }

    setIsSubmitting(true);
    try {
      await applyToJob(slug, formData);
      setIsSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToApply = () => {
    applySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isPublicLoading && !selectedJob) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading role details...</p>
        </div>
      </div>
    );
  }

  if (publicError || !selectedJob) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between">
        <header className="border-b border-gray-100 py-4 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button onClick={onNavigateHome} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg text-gray-900">Scritur</span>
            </button>
          </div>
        </header>

        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Position Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">
            This job posting may have expired or is no longer accepting new candidate applications.
          </p>
          <button
            onClick={onNavigateBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Explore All Open Roles</span>
          </button>
        </div>

        <FooterSection />
      </div>
    );
  }

  const job = selectedJob;
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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Schema.org JobPosting JSON-LD */}
      {job.json_ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(job.json_ld).replace(/</g, '\\u003c') }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>All Open Roles</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Job link copied to clipboard!');
              }}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              title="Share job link"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={scrollToApply}
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              Apply for this role
            </button>
          </div>
        </div>
      </header>

      {/* Main Job Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-16 w-full">
        {/* Job Header Card */}
        <div className="border-b border-gray-200 pb-8 mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {job.department}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
              {workplaceLabel}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
              {employmentTypeLabel}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span>{job.location || 'Remote'}</span>
            </div>
            {job.compensation_amount && (
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <DollarSign size={16} className="text-emerald-600" />
                <span>{job.compensation_amount}</span>
              </div>
            )}
            {job.duration && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span>{job.duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Structured Sections */}
        <div className="space-y-12 text-gray-700 leading-relaxed">
          {/* Overview */}
          {job.short_description && (
            <div className="p-6 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 text-base text-gray-800 font-medium leading-relaxed">
              {job.short_description}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-600" />
                About the Role
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.description}
              </div>
            </section>
          )}

          {/* Responsibilities */}
          {job.responsibilities && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                What You'll Do
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.responsibilities}
              </div>
            </section>
          )}

          {/* Requirements */}
          {job.requirements && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                Requirements & Experience
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.requirements}
              </div>
            </section>
          )}

          {/* Nice to have */}
          {job.nice_to_have && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                Nice to Have
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.nice_to_have}
              </div>
            </section>
          )}

          {/* What you will learn */}
          {job.what_you_will_learn && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <GraduationCap size={20} className="text-indigo-600" />
                What You Will Learn & Build
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.what_you_will_learn}
              </div>
            </section>
          )}

          {/* Benefits */}
          {job.benefits && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <HeartHandshake size={20} className="text-rose-500" />
                Benefits & Perks
              </h2>
              <div className="text-sm sm:text-base whitespace-pre-line text-gray-600 leading-relaxed">
                {job.benefits}
              </div>
            </section>
          )}
        </div>

        {/* Application Form Section */}
        <div ref={applySectionRef} className="mt-16 pt-12 border-t border-gray-200">
          <div className="bg-gray-50/70 rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-xs">
            {isSubmitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Application Received!</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Thank you for applying for the <span className="font-semibold text-gray-900">{job.title}</span> role at Scritur. Our team will carefully review your background and reach out soon.
                </p>
                <button
                  onClick={onNavigateBack}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <ArrowLeft size={16} />
                  <span>Back to all roles</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                    Apply for this position
                  </h3>
                  <p className="text-sm text-gray-500">
                    Fill out the form below. We review every application carefully within 48 hours.
                  </p>
                </div>

                {formError && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-3">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleApplySubmit} className="space-y-6">
                  {/* Basic fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ada Lovelace"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="ada@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Resume / CV <span className="text-rose-500">*</span> (PDF, DOCX, max 10MB)
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-white rounded-2xl p-6 text-center cursor-pointer transition-all group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                      />
                      {resumeFile ? (
                        <div className="flex items-center justify-center gap-3 text-indigo-700">
                          <FileText size={24} />
                          <div className="text-left">
                            <p className="text-sm font-semibold">{resumeFile.name}</p>
                            <p className="text-xs text-gray-400">
                              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <UploadCloud size={28} className="text-gray-400 group-hover:text-indigo-600 mx-auto transition-colors" />
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload or drag & drop your resume
                          </p>
                          <p className="text-xs text-gray-400">PDF, DOCX, or TXT up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social / Portfolio Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        LinkedIn Profile (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        GitHub Profile (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/username"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Portfolio / Website (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourportfolio.com"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Cover note */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Why Scritur? / Cover Note (Optional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about a project you loved building or why you're interested in Scritur..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting application...</span>
                        </>
                      ) : (
                        <span>Submit Application</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
