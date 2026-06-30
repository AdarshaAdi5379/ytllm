import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Wifi, FolderOpen, Folder, ChevronDown, ChevronRight,
  Youtube, FileText, Globe, Code, MessageSquare, Book, Plus, Trash2,
  Search, Sparkles, Brain, BarChart3, GraduationCap, Zap, Target,
  Star, Clock, TrendingUp, CheckCircle2,
} from 'lucide-react';

const folders = [
  {
    name: 'Supervised Learning',
    sources: [
      { icon: Youtube, label: 'Linear Regression Explained', color: 'text-rose-400' },
      { icon: FileText, label: 'SVM Theory Notes', color: 'text-amber-400' },
      { icon: Globe, label: 'Scikit-learn Guide', color: 'text-emerald-400' },
    ],
  },
  {
    name: 'Deep Learning',
    sources: [
      { icon: Youtube, label: 'Neural Networks from Scratch', color: 'text-rose-400' },
      { icon: Code, label: 'CNN Architecture', color: 'text-sky-400' },
    ],
  },
];

const recentChats = [
  { title: 'Backpropagation explained', count: 12 },
  { title: 'CNN vs RNN comparison', count: 8 },
  { title: 'Loss functions overview', count: 5 },
];

const sampleNotes = [
  'Key takeaways from Linear Regression',
  'Neural network architecture notes',
];

type Panel = 'chat' | 'flashcards' | 'summary' | 'progress' | 'quiz' | 'mentor' | 'notes';

const sampleMessages = [
  {
    role: 'user',
    content: 'Can you explain how backpropagation works in neural networks?',
  },
  {
    role: 'assistant',
    content:
      'Backpropagation is the core algorithm that trains neural networks by computing gradients of the loss function with respect to each weight.\n\nIt works in two phases:\n\nForward pass — Input data flows through the network layer by layer to produce an output prediction.\n\nBackward pass — The gradient of the loss is propagated backward using the chain rule. Each layer\'s contribution to the error is computed and weights are updated to minimize the loss.\n\nThe key insight is that local gradients from the forward pass are reused during the backward pass, which makes the algorithm efficient.',
    citations: [
      { label: 'Neural Networks from Scratch', type: 'YouTube' },
      { label: 'Linear Regression Explained', type: 'YouTube' },
    ],
  },
];

const panels: { id: Panel; icon: any; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'notes', icon: Book, label: 'Notes' },
  { id: 'summary', icon: Sparkles, label: 'Summaries' },
  { id: 'flashcards', icon: Brain, label: 'Flashcards' },
  { id: 'quiz', icon: Zap, label: 'Quiz' },
  { id: 'mentor', icon: GraduationCap, label: 'Mentor' },
  { id: 'progress', icon: BarChart3, label: 'Progress' },
];

const heatmapData = [
  [3, 0, 1, 2, 5, 7, 4],
  [2, 4, 6, 3, 1, 0, 2],
  [0, 1, 3, 5, 2, 4, 6],
  [5, 2, 0, 1, 3, 2, 4],
  [1, 3, 4, 2, 6, 5, 3],
];

export function WorkspaceShowcaseSection() {
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Supervised Learning': true,
    'Deep Learning': false,
  });
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProgressAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const toggleFolder = (name: string) =>
    setExpandedFolders((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <section id="product-showcase" className="bg-gray-50 py-24 lg:py-28">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            One Workspace. Everything You Need to Learn.
          </h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            Bring together videos, PDFs, GitHub repositories, websites, notes, and documents
            into one intelligent workspace that grows with your learning.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[280px_1fr] gap-6">
          {/* ─── Sidebar ─── */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="p-4 border-b border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <LayoutDashboard size={15} className="text-white" />
                  </div>
                  <span className="text-xs font-black text-white tracking-widest uppercase">KnowledgeOS</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-tighter">
                  <Wifi size={8} />
                  <span>Online</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-xs font-semibold text-white">
                <FolderOpen size={12} className="text-indigo-400" />
                <span className="flex-1 truncate">Machine Learning Fundamentals</span>
                <ChevronDown size={11} className="text-slate-500" />
              </div>
            </div>

            <div className="p-3 space-y-1">
              {folders.map((folder) => {
                const isOpen = expandedFolders[folder.name];
                return (
                  <div key={folder.name}>
                    <button
                      onClick={() => toggleFolder(folder.name)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/50 transition-all"
                    >
                      {isOpen ? (
                        <ChevronDown size={10} className="text-slate-500" />
                      ) : (
                        <ChevronRight size={10} className="text-slate-500" />
                      )}
                      {isOpen ? (
                        <FolderOpen size={11} className="text-indigo-400" />
                      ) : (
                        <Folder size={11} className="text-slate-500" />
                      )}
                      <span className="flex-1 truncate">{folder.name}</span>
                    </button>
                    {isOpen && (
                      <div className="ml-4 space-y-0.5">
                        {folder.sources.map((source) => {
                          const Icon = source.icon;
                          return (
                            <div
                              key={source.label}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-default"
                            >
                              <Icon size={11} className={`${source.color} flex-shrink-0`} />
                              <span className="truncate">{source.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-3">
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Chats</span>
              </div>
              <div className="space-y-0.5 mb-4">
                {recentChats.map((chat) => (
                  <div
                    key={chat.title}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-default"
                  >
                    <MessageSquare size={10} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{chat.title}</span>
                    <span className="text-[10px] font-mono text-slate-600">{chat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-3 mb-3">
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</span>
              </div>
              <div className="space-y-0.5">
                {sampleNotes.map((note) => (
                  <div
                    key={note}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-default"
                  >
                    <FileText size={10} className="flex-shrink-0" />
                    <span className="truncate">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-800/50 space-y-1">
              <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition-all cursor-default">
                <Youtube size={12} />
                <span>Add YouTube Video</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition-all cursor-default">
                <Globe size={12} />
                <span>Import Website</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition-all cursor-default">
                <Plus size={12} />
                <span>Upload Document</span>
              </div>
            </div>
          </div>

          {/* ─── Main Panel ─── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-100 overflow-x-auto">
              {panels.map((p) => {
                const Icon = p.icon;
                const isActive = activePanel === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePanel(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={12} />
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activePanel === 'chat' && (
                <div key="chat" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div className="space-y-4 max-w-3xl">
                    {sampleMessages.map((msg, i) => (
                      <div key={i}>
                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-bl-md'
                            }`}
                          >
                            {msg.content.split('\n').map((line, li) => (
                              <p key={li} className={li > 0 ? 'mt-2' : ''}>{line}</p>
                            ))}
                          </div>
                        </div>
                        {msg.role === 'assistant' && msg.citations && (
                          <div className="flex gap-1.5 flex-wrap mt-2 ml-2">
                            {msg.citations.map((c, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
                              >
                                [{ci + 1}] {c.label}
                                <span className="text-indigo-400">·</span>
                                {c.type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <MessageSquare size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-400">Ask a question about your sources...</span>
                  </div>
                </div>
              )}

              {activePanel === 'flashcards' && (
                <div key="flashcards" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-lg mx-auto">
                  <div
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    style={{ perspective: '1000px', cursor: 'pointer' }}
                    className="mb-4"
                  >
                    <div
                      style={{
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.5s',
                        transform: flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        minHeight: '220px',
                      }}
                    >
                      <div
                        style={{ backfaceVisibility: 'hidden' }}
                        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center"
                      >
                        <Brain size={24} className="text-indigo-400 mb-3" />
                        <p className="text-sm font-semibold text-gray-800 mb-1">
                          What is the chain rule and why is it important in backpropagation?
                        </p>
                        <p className="text-xs text-gray-400 mt-4">Click to reveal answer</p>
                      </div>
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          position: 'absolute',
                          inset: 0,
                        }}
                        className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center"
                      >
                        <CheckCircle2 size={24} className="text-emerald-500 mb-3" />
                        <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                          The chain rule computes the gradient of a composite function. In backpropagation,
                          it allows us to calculate how each weight contributes to the final error by
                          multiplying local gradients along the path from output to input.
                        </p>
                        <p className="text-xs text-gray-400 mt-4">Click to flip back</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 text-center">3 cards in deck</p>
                </div>
              )}

              {activePanel === 'summary' && (
                <div key="summary" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Youtube size={14} className="text-rose-500" />
                    <span className="text-xs font-medium text-gray-500">Linear Regression Explained</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">YouTube</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    {['Short', 'Detailed', 'Key Points'].map((t) => (
                      <span
                        key={t}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-default ${
                          t === 'Short'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                    <p>
                      Linear regression models the relationship between a dependent variable and one
                      or more independent variables by fitting a linear equation to observed data.
                    </p>
                    <p>
                      The model finds the best-fitting line by minimizing the sum of squared residuals
                      — the vertical distances between data points and the regression line.
                    </p>
                    {summaryExpanded && (
                      <>
                        <p>
                          Key concepts include the coefficient of determination (R²), which measures
                          how well the model explains the variance in the data, and p-values for
                          determining feature significance.
                        </p>
                        <p>
                          Important assumptions for linear regression include linearity, independence
                          of observations, homoscedasticity (constant variance of residuals), and
                          approximate normality of residuals.
                        </p>
                      </>
                    )}
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {summaryExpanded ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                </div>
              )}

              {activePanel === 'progress' && (
                <div key="progress" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-2xl">
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-5 text-white mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-medium text-violet-200 uppercase tracking-wider">Knowledge Score</p>
                        <p className="text-3xl font-bold mt-0.5">342</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Target size={22} className="text-violet-200" />
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: progressAnimated ? '34.2%' : '0%' }}
                      />
                    </div>
                    <p className="text-xs text-violet-200 mt-1.5">342 / 1000</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: TrendingUp, label: 'Accuracy', value: '78%', color: 'text-emerald-600' },
                      { icon: Star, label: 'Streak', value: '5 days', color: 'text-amber-600' },
                      { icon: Clock, label: 'Reviewed', value: '24 cards', color: 'text-indigo-600' },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={12} className={stat.color} />
                            <span className="text-[10px] font-medium text-gray-400">{stat.label}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">{stat.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity</p>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, week) => (
                        <div key={week} className="flex flex-col gap-1">
                          {Array.from({ length: 7 }).map((_, day) => {
                            const val = heatmapData[week]?.[day] ?? 0;
                            const intensity =
                              val === 0 ? 'bg-gray-100' :
                              val <= 2 ? 'bg-emerald-200' :
                              val <= 4 ? 'bg-emerald-300' :
                              val <= 6 ? 'bg-emerald-400' :
                              'bg-emerald-500';
                            return <div key={day} className={`w-3 h-3 rounded-sm ${intensity}`} />;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'quiz' && (
                <div key="quiz" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-xl mx-auto">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap size={14} className="text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        MCQ · 3 questions
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mb-4">
                      What is the primary purpose of backpropagation in neural networks?
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: 'Feature extraction from input data', correct: false },
                        { label: 'Computing gradients of the loss with respect to weights', correct: true },
                        { label: 'Augmenting the training dataset', correct: false },
                        { label: 'Deploying the model to production', correct: false },
                      ].map((opt) => (
                        <div
                          key={opt.label}
                          onClick={() => setQuizAnswered(true)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm border transition-all cursor-default ${
                            quizAnswered && opt.correct
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : quizAnswered
                              ? 'bg-gray-50 border-gray-200 text-gray-500'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              quizAnswered && opt.correct
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {quizAnswered && opt.correct && (
                              <CheckCircle2 size={10} className="text-white" />
                            )}
                          </div>
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'mentor' && (
                <div key="mentor" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-xl mx-auto">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-800 max-w-[85%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <GraduationCap size={12} className="text-indigo-600" />
                          <span className="text-xs font-semibold text-indigo-600">AI Mentor</span>
                        </div>
                        <p>
                          Let&apos;s test your understanding of neural networks. Can you explain what
                          happens when a gradient becomes too small during backpropagation?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[85%]">
                        The network stops learning effectively because the weight updates become negligible...
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-gray-800 max-w-[85%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">Correct</span>
                        </div>
                        <p>
                          That&apos;s right. This is called the vanishing gradient problem. It makes
                          deep networks hard to train because early layers receive very small updates.
                          Techniques like ReLU activation and residual connections help mitigate this.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                      <GraduationCap size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-400">Continue this session...</span>
                    </div>
                  </div>
                </div>
              )}

              {activePanel === 'notes' && (
                <div key="notes" style={{ animation: 'fadeIn 0.3s ease-out' }} className="max-w-xl">
                  <p className="text-xs text-gray-400 mb-3">Notes from your learning sessions</p>
                  {sampleNotes.map((note, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl mb-2 hover:border-gray-200 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{note}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {i === 0 ? 'Linear regression basics, assumptions, and code example' : 'Layer types, activation functions, and architecture patterns'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
