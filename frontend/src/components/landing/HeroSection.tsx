import { Download, FileText, Layers, Brain, GraduationCap, BarChart3, Sparkles, PlayCircle } from 'lucide-react';

interface HeroSectionProps {
  onStartLearning: () => void;
  onSignIn: () => void;
}

const pipelineSteps = [
  { icon: Download, label: 'Import Content' },
  { icon: FileText, label: 'Summarize' },
  { icon: Layers, label: 'Flashcards' },
  { icon: Brain, label: 'Quiz' },
  { icon: GraduationCap, label: 'Mentor' },
  { icon: BarChart3, label: 'Progress' },
];

const gradients = [
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
  'from-violet-500 to-violet-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-rose-500 to-rose-600',
];

export function HeroSection({ onStartLearning, onSignIn }: HeroSectionProps) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">KnowledgeOS</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignIn}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={onStartLearning}
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg transition-all shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20 pt-16 lg:pt-28 pb-20">

          {/* Left column */}
          <div className="flex-1 w-full lg:max-w-[55%]">
            <div
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-sm font-medium text-indigo-700 mb-8"
              style={{ animation: 'fadeSlideUp 0.5s ease-out 0s both' }}
            >
              <Sparkles size={14} />
              Built for learners who want more than answers
            </div>

            <h1
              className="text-[2.5rem] lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6"
              style={{ animation: 'fadeSlideUp 0.5s ease-out 0.1s both' }}
            >
              Stop Chatting With Content.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Start Mastering It.
              </span>
            </h1>

            <p
              className="text-lg text-gray-600 leading-relaxed max-w-xl mb-10"
              style={{ animation: 'fadeSlideUp 0.5s ease-out 0.2s both' }}
            >
              Import YouTube videos, PDFs, GitHub repositories, websites, and notes into one AI workspace that teaches you, quizzes you, tracks your progress, and helps you remember what you learn.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center gap-4 mb-10"
              style={{ animation: 'fadeSlideUp 0.5s ease-out 0.3s both' }}
            >
              <button
                onClick={onStartLearning}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Start Learning Free
              </button>
              <button className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-base rounded-xl hover:shadow-sm transition-all flex items-center justify-center gap-2">
                <PlayCircle size={18} />
                Watch Demo
              </button>
            </div>

            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400"
              style={{ animation: 'fadeSlideUp 0.5s ease-out 0.4s both' }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Import from 5+ content types
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Flashcards and quizzes included
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Progress tracking built in
              </span>
            </div>
          </div>

          {/* Right column — Learning pipeline */}
          <div className="flex-1 w-full lg:max-w-[45%]">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-rose-200 rounded-full" />

              {pipelineSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="relative flex items-center gap-5 mb-6 last:mb-0"
                    style={{ animation: `fadeSlideUp 0.4s ease-out ${0.2 + i * 0.12}s both` }}
                  >
                    {/* Dot on the line */}
                    <div className={`absolute left-[15px] w-[9px] h-[9px] rounded-full border-2 border-white shadow-sm bg-gradient-to-br ${gradients[i]}`} />
                    {/* Card */}
                    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow w-full ml-2">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradients[i]} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{step.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
