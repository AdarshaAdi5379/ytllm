import { Download, Sparkles, BarChart3, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onStartLearning: () => void;
}

const steps = [
  {
    icon: Download,
    headline: 'Import anything',
    body: 'Drop in a YouTube link, a PDF, or a GitHub repo. KnowledgeOS pulls out the key ideas and organizes them for you.',
  },
  {
    icon: Sparkles,
    headline: 'Learn with AI',
    body: 'Turn what you\'ve imported into flashcards, quizzes, and study guides. The tools adapt to what you\'re learning — no setup needed.',
  },
  {
    icon: BarChart3,
    headline: 'Retain and improve',
    body: 'Spaced reminders keep knowledge fresh. Track what you\'ve mastered and where to focus next. An AI mentor fills in the gaps.',
  },
];

export function HowItWorksSection({ onStartLearning }: HowItWorksSectionProps) {
  return (
    <section className="bg-gray-50 py-24 lg:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">
            The workflow
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Here&apos;s how it works
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Import content from anywhere, then learn with tools that adapt to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.headline} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                  <Icon size={22} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.headline}
                </h3>
                <p className="text-base text-gray-500 leading-relaxed">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <button
            onClick={onStartLearning}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Start learning free
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
