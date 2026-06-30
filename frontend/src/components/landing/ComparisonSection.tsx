import {
  MessageSquare, Bot, XCircle, Download, FileText,
  Layers, Brain, GraduationCap, BarChart3, Target,
  ArrowDown, ArrowRight,
} from 'lucide-react';

const gradients = [
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
  'from-violet-500 to-violet-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-rose-500 to-rose-600',
];

const traditionalSteps = [
  { icon: MessageSquare, label: 'Question' },
  { icon: Bot, label: 'Answer' },
  { icon: XCircle, label: 'Chat Ends' },
];

const knowledgeRows = [
  [
    { icon: Download, label: 'Import' },
    { icon: FileText, label: 'Summarize' },
    { icon: Layers, label: 'Flashcards' },
  ],
  [
    { icon: Brain, label: 'Quiz' },
    { icon: GraduationCap, label: 'AI Mentor' },
    { icon: BarChart3, label: 'Progress' },
  ],
];

export function ComparisonSection() {
  return (
    <section className="bg-white py-24 lg:py-28">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Why KnowledgeOS Feels Different
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Most AI tools give you an answer. KnowledgeOS helps you understand it, practice it, and remember it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ─── Traditional AI Chat ─── */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 lg:p-8">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">
              Traditional AI Chat
            </p>
            <div className="space-y-0">
              {traditionalSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label}>
                    {i > 0 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown size={16} className="text-gray-300" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">{step.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── KnowledgeOS ─── */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 lg:p-8">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-8">
              KnowledgeOS
            </p>
            <div className="space-y-0">
              {knowledgeRows.map((row, rowIdx) => (
                <div key={rowIdx}>
                  {rowIdx > 0 && (
                    <div className="flex justify-center py-3">
                      <ArrowDown size={18} className="text-indigo-300" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    {row.map((step, stepIdx) => {
                      const Icon = step.icon;
                      const globalIdx = rowIdx * 3 + stepIdx;
                      const delay = globalIdx * 0.08;
                      return (
                        <div key={step.label} className="flex items-center gap-1.5 lg:gap-2 flex-1 min-w-0">
                          {stepIdx > 0 && (
                            <ArrowRight size={14} className="text-indigo-300 flex-shrink-0" />
                          )}
                          <div
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-indigo-100/50 shadow-sm flex-1 min-w-0"
                            style={{ animation: `fadeSlideUp 0.4s ease-out ${delay}s both` }}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradients[globalIdx]} flex items-center justify-center flex-shrink-0`}>
                              <Icon size={16} className="text-white" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                              {step.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-center mt-4">
                <div
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                  style={{ animation: 'fadeSlideUp 0.4s ease-out 0.48s both' }}
                >
                  <Target size={16} />
                  <span className="text-sm font-bold">Mastery</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
