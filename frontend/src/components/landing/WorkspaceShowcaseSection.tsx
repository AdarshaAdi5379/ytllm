import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Wifi, FolderOpen, Folder, FolderPlus, ChevronDown, ChevronRight,
  Plus, Search, Sparkles, Brain, BarChart3, GraduationCap, Zap, Target,
  Star, Clock, TrendingUp, CheckCircle2, AlertTriangle,
  BookOpen, Book, FileText, Youtube, Globe, Code, MessageSquare, Paperclip,
  SlidersHorizontal, Send, Copy, Check, Layers, Award, Flame, ArrowRight
} from 'lucide-react';

type ViewMode = 'home' | 'chat' | 'notes' | 'search' | 'summary' | 'flashcards' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor';

const folders = [
  {
    name: 'Supervised Learning',
    sources: [
      { icon: Youtube, label: 'Linear Regression Explained' },
      { icon: FileText, label: 'SVM Theory & Kernels.pdf' },
      { icon: Globe, label: 'Scikit-learn Guide' },
    ],
  },
  {
    name: 'Deep Learning',
    sources: [
      { icon: Youtube, label: 'Neural Networks from Scratch' },
      { icon: Code, label: 'PyTorch ResNet Models' },
    ],
  },
];

const unfiledSources = [
  { icon: FileText, label: 'Backpropagation Notes.md' },
];

const recentChats = [
  { id: '1', title: 'Backpropagation explained', count: 12 },
  { id: '2', title: 'CNN vs RNN comparison', count: 8 },
  { id: '3', title: 'Loss functions overview', count: 5 },
  { id: '4', title: 'Attention & Transformers', count: 15 },
];

const sampleNotes = [
  {
    title: 'Key Takeaways: Backpropagation & Chain Rule',
    topic: 'Deep Learning',
    difficulty: 'intermediate',
    importance: 4,
    preview: '∂L/∂w = ∂L/∂y · ∂y/∂z · ∂z/∂w — Local gradients from forward pass are cached and multiplied backward.',
    date: '2 hours ago',
  },
  {
    title: 'Loss Functions & Regularization Techniques',
    topic: 'Supervised Learning',
    difficulty: 'advanced',
    importance: 5,
    preview: 'Cross-entropy vs MSE. L1 (Lasso) promotes sparsity while L2 (Ridge) prevents large weight magnitudes.',
    date: 'Yesterday',
  },
];

const heatmapData = [
  [3, 0, 1, 2, 5, 7, 4],
  [2, 4, 6, 3, 1, 0, 2],
  [0, 1, 3, 5, 2, 4, 6],
  [5, 2, 0, 1, 3, 2, 4],
  [1, 3, 4, 2, 6, 5, 3],
];

export function WorkspaceShowcaseSection() {
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Supervised Learning': true,
    'Deep Learning': false,
  });
  const [showSessionSidebar, setShowSessionSidebar] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState('1');
  const [summaryType, setSummaryType] = useState<'short' | 'detailed' | 'key_points'>('short');
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setProgressAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const toggleFolder = (name: string) =>
    setExpandedFolders((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <section id="product-showcase" className="bg-gray-50 py-24 lg:py-28">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-600 mb-4">
            <Sparkles size={13} />
            Live Product Experience
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            One Workspace. Everything You Need to Learn.
          </h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto">
            Bring together YouTube videos, PDFs, GitHub repositories, websites, and notes
            into one connected AI operating system that teaches, quizzes, and tracks your mastery.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[280px_1fr] gap-6">
          {/* ─── Sidebar ─── */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="p-4 border-b border-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
                      <LayoutDashboard size={17} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">Scritur</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                    <Wifi size={10} />
                    <span>Online</span>
                  </div>
                </div>

                {/* App mode toggle */}
                <div className="flex items-center gap-1 mb-3 bg-slate-800/50 rounded-lg p-0.5">
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium text-slate-400">
                    <Sparkles size={12} />
                    <span>Standalone</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium bg-indigo-600 text-white shadow-sm">
                    <Layers size={12} />
                    <span>Workspace</span>
                  </div>
                </div>

                {/* Workspace Switcher */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-xs font-semibold text-white mb-2">
                  <FolderOpen size={12} className="text-indigo-400" />
                  <span className="flex-1 truncate">Machine Learning Fundamentals</span>
                  <ChevronDown size={11} className="text-slate-500" />
                </div>

                {/* Add Source Menu */}
                <button
                  onClick={() => setActiveView('chat')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Source</span>
                </button>
              </div>

              {/* Folders tree */}
              <div className="p-3 border-b border-slate-800/50">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-medium text-slate-500">Folders</span>
                  <FolderPlus size={12} className="text-slate-500" />
                </div>

                <div className="space-y-1">
                  {folders.map((folder) => {
                    const isOpen = expandedFolders[folder.name];
                    return (
                      <div key={folder.name}>
                        <button
                          onClick={() => toggleFolder(folder.name)}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/50 transition-all text-left"
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
                                  <Icon size={11} className="text-slate-400 flex-shrink-0" />
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

                {/* Unfiled sources */}
                <div className="pt-2 px-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-slate-500">Unfiled sources</span>
                    <span className="text-[10px] text-slate-600 font-mono">1</span>
                  </div>
                  {unfiledSources.map((source) => {
                    const Icon = source.icon;
                    return (
                      <div
                        key={source.label}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all cursor-default"
                      >
                        <Icon size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{source.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Learning section */}
              <div className="p-3">
                <div className="px-1 mb-1.5">
                  <span className="text-[10px] font-medium text-slate-500">Learning</span>
                </div>
                <div className="space-y-0.5">
                  {[
                    { id: 'flashcards' as const, icon: Zap, label: 'Flashcards' },
                    { id: 'quiz' as const, icon: Brain, label: 'Quiz' },
                    { id: 'path' as const, icon: BookOpen, label: 'Learning Path' },
                    { id: 'revision' as const, icon: GraduationCap, label: 'Daily Revision' },
                    { id: 'progress' as const, icon: BarChart3, label: 'Progress' },
                    { id: 'mentor' as const, icon: Sparkles, label: 'Mentor' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                            : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800/50 text-[11px] text-slate-500 text-center">
              Active Workspace · 6 sources
            </div>
          </div>

          {/* ─── Main Panel ─── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[620px]">
            {/* Header Toolbar (Matching WorkspaceChatPanel) */}
            <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                {/* Home button */}
                <button
                  onClick={() => setActiveView('home')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeView === 'home' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Home Dashboard"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span className="hidden sm:inline">Home</span>
                </button>

                <div className="hidden sm:block w-px h-4 bg-gray-200" />

                {/* Chats toggle */}
                <button
                  onClick={() => {
                    setActiveView('chat');
                    setShowSessionSidebar(!showSessionSidebar);
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeView === 'chat' && showSessionSidebar ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare size={13} />
                  <span>Chats</span>
                  <ChevronRight size={11} className={`transition-transform ${showSessionSidebar ? 'rotate-90' : ''}`} />
                </button>

                {/* New Chat */}
                <button
                  onClick={() => setActiveView('chat')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <Plus size={12} />
                  <span className="hidden sm:inline">New Chat</span>
                </button>

                <div className="hidden sm:block w-px h-4 bg-gray-200" />

                {/* 4 Core Tabs */}
                {[
                  { mode: 'chat' as const, icon: MessageSquare, label: 'Chat' },
                  { mode: 'notes' as const, icon: Book, label: 'Notes' },
                  { mode: 'search' as const, icon: Search, label: 'Search' },
                  { mode: 'summary' as const, icon: Sparkles, label: 'Summary' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeView === tab.mode;
                  return (
                    <button
                      key={tab.mode}
                      onClick={() => setActiveView(tab.mode)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>Actions</span>
                </div>
                <div className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                  <SlidersHorizontal size={13} />
                </div>
              </div>
            </header>

            {/* View Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Optional inner chat session list for Chat view */}
              {activeView === 'chat' && showSessionSidebar && (
                <div className="hidden md:flex w-52 flex-shrink-0 border-r border-gray-100 bg-gray-50/70 flex-col p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Recent Sessions
                  </div>
                  {recentChats.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      className={`w-full flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left ${
                        s.id === activeSessionId
                          ? 'bg-indigo-100 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <MessageSquare size={11} className="flex-shrink-0" />
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{s.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Main content body */}
              <div className="flex-1 p-5 overflow-y-auto bg-white flex flex-col justify-between">
                {/* ─── HOME DASHBOARD VIEW ─── */}
                {activeView === 'home' && (
                  <div key="home" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-6 max-w-3xl">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Good afternoon, Alex</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Machine Learning Fundamentals</p>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <button onClick={() => setActiveView('chat')} className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1">
                        <MessageSquare size={12} /> Start chat
                      </button>
                      <button onClick={() => setActiveView('chat')} className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1">
                        <Plus size={12} /> Import source
                      </button>
                      <button onClick={() => setActiveView('progress')} className="text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1">
                        <BarChart3 size={12} /> View analytics
                      </button>
                    </div>

                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Continue Learning</h3>
                      <div className="space-y-1.5">
                        {recentChats.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setActiveSessionId(s.id);
                              setActiveView('chat');
                            }}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer"
                          >
                            <MessageSquare size={13} className="text-indigo-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{s.title}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{s.count} messages</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Reviews Due</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div onClick={() => setActiveView('flashcards')} className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-indigo-900">Flashcards</span>
                            <Zap size={14} className="text-indigo-600" />
                          </div>
                          <p className="text-2xl font-extrabold text-indigo-600">8</p>
                          <p className="text-[10px] text-indigo-500">cards ready for review</p>
                        </div>
                        <div onClick={() => setActiveView('quiz')} className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-amber-900">Quiz</span>
                            <Brain size={14} className="text-amber-600" />
                          </div>
                          <p className="text-2xl font-extrabold text-amber-600">2</p>
                          <p className="text-[10px] text-amber-500">quizzes pending</p>
                        </div>
                        <div onClick={() => setActiveView('mentor')} className="p-3 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-purple-900">AI Mentor</span>
                            <GraduationCap size={14} className="text-purple-600" />
                          </div>
                          <p className="text-xs font-semibold text-purple-700 mt-1 line-clamp-1">Vanishing Gradients</p>
                          <p className="text-[10px] text-purple-500 mt-1">Resume active session</p>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* ─── CHAT VIEW ─── */}
                {activeView === 'chat' && (
                  <div key="chat" style={{ animation: 'fadeIn 0.25s ease-out' }} className="flex-1 flex flex-col justify-between max-w-3xl">
                    <div className="space-y-4">
                      {/* Attached source badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Youtube size={11} className="text-rose-500" />
                          Linear Regression Explained
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <FileText size={11} className="text-slate-500" />
                          SVM Theory & Kernels.pdf
                        </span>
                      </div>

                      {/* User message */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm bg-indigo-600 text-white leading-relaxed">
                          Can you explain how backpropagation works in neural networks and why the chain rule is used?
                        </div>
                      </div>

                      {/* Assistant message */}
                      <div className="flex justify-start">
                        <div className="max-w-[90%] space-y-3">
                          <div className="rounded-2xl rounded-bl-md px-4 py-3 text-sm bg-gray-100 text-gray-800 leading-relaxed">
                            <p className="font-semibold text-gray-900 mb-1">Backpropagation Overview:</p>
                            <p className="mb-2">
                              Backpropagation calculates the gradient of the loss function with respect to each weight by applying the <strong>chain rule</strong> of calculus layer-by-layer backwards.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-gray-700">
                              <li><strong>Forward Pass:</strong> Computes activations and predicted output across each network layer.</li>
                              <li><strong>Backward Pass:</strong> Reverses data flow to calculate local derivatives and updates weights using gradient descent.</li>
                            </ul>
                          </div>

                          {/* Citations */}
                          <div className="flex gap-2 flex-wrap ml-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              [1] Neural Networks from Scratch · YouTube
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              [2] Linear Regression Explained · YouTube
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chat Input Bar */}
                    <div className="mt-6 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                        <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Attach Source">
                          <Paperclip size={15} />
                        </button>
                        <span className="text-xs text-gray-400 bg-gray-200/70 px-1.5 py-0.5 rounded font-mono">gpt-4o</span>
                        <span className="text-xs text-gray-500 flex-1 truncate">Ask a question about your sources...</span>
                        <button className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── NOTES VIEW ─── */}
                {activeView === 'notes' && (
                  <div key="notes" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-3xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Workspace Notes & Summaries</h3>
                        <p className="text-xs text-gray-400">Structured markdown notes with automatic AI concept extraction</p>
                      </div>
                      <button className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                        <Plus size={12} /> New Note
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {sampleNotes.map((note) => (
                        <div key={note.title} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-200 transition-all bg-white shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-900">{note.title}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                note.difficulty === 'advanced' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}>
                                {note.difficulty}
                              </span>
                              <div className="flex items-center text-amber-400">
                                {Array.from({ length: note.importance }).map((_, i) => (
                                  <Star key={i} size={10} fill="currentColor" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded-lg mb-2">
                            {note.preview}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                              <Sparkles size={10} /> AI Analyzed · 2 citations linked
                            </span>
                            <span>{note.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── SEARCH VIEW ─── */}
                {activeView === 'search' && (
                  <div key="search" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-3xl">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        readOnly
                        value={searchFilter || 'gradient descent optimization algorithms'}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-gray-800 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {['All types', 'YouTube', 'PDFs', 'Websites', 'Notes'].map((t, i) => (
                        <span key={t} className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="p-3.5 border border-emerald-100 bg-emerald-50/20 rounded-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-slate-500" />
                            <span className="text-xs font-bold text-gray-900">SVM Theory & Kernels.pdf</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            94% match
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          &ldquo;...stochastic <span className="bg-amber-100 font-medium text-amber-900 px-0.5 rounded">gradient descent</span> optimizes the objective function with learning rate decay, adapting parameter steps based on mini-batch loss...&rdquo;
                        </p>
                      </div>

                      <div className="p-3.5 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Youtube size={13} className="text-rose-500" />
                            <span className="text-xs font-bold text-gray-900">Neural Networks from Scratch</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            88% match
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          &ldquo;...computing local gradients during the backward pass enables adaptive moment estimation (Adam) to converge faster than standard SGD...&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── SUMMARY VIEW ─── */}
                {activeView === 'summary' && (
                  <div key="summary" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-3xl">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Youtube size={15} className="text-rose-500" />
                        <span className="text-xs font-bold text-gray-800">Linear Regression Explained</span>
                        <span className="text-xs text-gray-400">· YouTube Source</span>
                      </div>
                      <button
                        onClick={() => {
                          setCopiedSummary(true);
                          setTimeout(() => setCopiedSummary(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {copiedSummary ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copiedSummary ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {(['short', 'detailed', 'key_points'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setSummaryType(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            summaryType === t
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed space-y-2.5">
                      <p className="font-semibold text-gray-900">Summary Overview:</p>
                      <p>
                        Linear regression models the linear relationship between a dependent target variable and one or more independent predictor features by fitting a linear hyperplane that minimizes the sum of squared residuals (OLS).
                      </p>
                      {summaryType !== 'short' && (
                        <>
                          <p className="font-semibold text-gray-900 pt-1">Core Mathematical Foundations:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Hypothesis:</strong> ŷ = θ₀ + θ₁x₁ + ... + θₙxₙ</li>
                            <li><strong>Loss Function:</strong> Mean Squared Error (MSE) J(θ) = 1/(2m) ∑(ŷᵢ - yᵢ)²</li>
                            <li><strong>Key Assumptions:</strong> Linearity, strict exogeneity, homoscedasticity, and lack of multicollinearity.</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── FLASHCARDS VIEW ─── */}
                {activeView === 'flashcards' && (
                  <div key="flashcards" style={{ animation: 'fadeIn 0.25s ease-out' }} className="max-w-lg mx-auto w-full space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">Deck: Deep Learning Foundations</span>
                      <span>Card 3 of 8</span>
                    </div>

                    {/* 3D Flip Card */}
                    <div
                      onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                      style={{ perspective: '1000px', cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          transformStyle: 'preserve-3d',
                          transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          minHeight: '230px',
                        }}
                        className="relative"
                      >
                        {/* Front */}
                        <div
                          style={{ backfaceVisibility: 'hidden' }}
                          className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center absolute inset-0"
                        >
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 mb-3">
                            Medium Difficulty
                          </span>
                          <p className="text-sm font-bold text-gray-900 leading-snug max-w-sm">
                            What is the vanishing gradient problem and how does the ReLU activation function mitigate it?
                          </p>
                          <p className="text-[11px] text-gray-400 mt-5">Click card or press Space to reveal answer</p>
                        </div>

                        {/* Back */}
                        <div
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                          className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center absolute inset-0"
                        >
                          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mb-2">
                            <CheckCircle2 size={14} /> Answer & Explanation
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed max-w-sm">
                            In deep networks with sigmoid/tanh activations, derivatives &lt; 1 cause gradients to shrink exponentially towards 0 in earlier layers. <strong>ReLU</strong> solves this because its derivative is constant (1.0) for all positive inputs, ensuring gradients flow back cleanly.
                          </p>
                          <p className="text-[10px] text-indigo-500 mt-3 font-semibold">Source: Neural Networks from Scratch</p>
                        </div>
                      </div>
                    </div>

                    {/* SM-2 Spaced Repetition Buttons */}
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 text-center uppercase tracking-wider mb-2">
                        Rate Your Recall (SM-2 Algorithm)
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { val: 0, label: 'Again', color: 'bg-rose-500 hover:bg-rose-600 text-white' },
                          { val: 1, label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
                          { val: 2, label: 'Good', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                          { val: 3, label: 'Easy', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
                        ].map((btn) => (
                          <button
                            key={btn.val}
                            onClick={() => setSelectedRating(btn.val)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${btn.color} ${
                              selectedRating === btn.val ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : ''
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── QUIZ VIEW ─── */}
                {activeView === 'quiz' && (
                  <div key="quiz" style={{ animation: 'fadeIn 0.25s ease-out' }} className="max-w-xl mx-auto w-full space-y-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Brain size={16} className="text-indigo-600" />
                          <span className="text-xs font-bold text-gray-800">Quiz: Deep Learning Mastery</span>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                          <Clock size={11} /> 03:45
                        </div>
                      </div>

                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-4">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: '40%' }} />
                      </div>

                      <p className="text-sm font-bold text-gray-900 mb-4">
                        Question 2 of 5: Which activation function avoids gradient saturation for all positive inputs?
                      </p>

                      <div className="space-y-2">
                        {[
                          { id: 0, label: 'A. Sigmoid', correct: false },
                          { id: 1, label: 'B. Hyperbolic Tangent (Tanh)', correct: false },
                          { id: 2, label: 'C. Rectified Linear Unit (ReLU)', correct: true },
                          { id: 3, label: 'D. Softmax', correct: false },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setQuizAnswered(opt.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                              quizAnswered !== null && opt.correct
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : quizAnswered === opt.id && !opt.correct
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {quizAnswered !== null && opt.correct && (
                              <CheckCircle2 size={14} className="text-emerald-600" />
                            )}
                          </button>
                        ))}
                      </div>

                      {quizAnswered !== null && (
                        <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                          <strong>Correct!</strong> ReLU outputs f(x) = max(0, x). For all x &gt; 0, its derivative is constant 1, which prevents saturation and vanishing gradients.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── LEARNING PATH VIEW ─── */}
                {activeView === 'path' && (
                  <div key="path" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-3xl">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Learning Path: ML Engineer Curriculum</h3>
                        <p className="text-xs text-gray-400">Step-by-step modular progression based on your ingested sources</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                        65% Completed
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { title: 'Module 1: Mathematical Foundations', desc: 'Linear Algebra, Matrix Calculus & Probabilities', status: 'completed' },
                        { title: 'Module 2: Classical Supervised Learning', desc: 'Linear Regression, Regularization & Support Vector Machines', status: 'current' },
                        { title: 'Module 3: Deep Neural Architectures', desc: 'Backpropagation, Convolutions, and Attention Mechanisms', status: 'locked' },
                      ].map((mod, i) => (
                        <div key={mod.title} className={`p-4 rounded-xl border transition-all ${
                          mod.status === 'completed' ? 'border-emerald-200 bg-emerald-50/20' :
                          mod.status === 'current' ? 'border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-200' :
                          'border-gray-200 bg-gray-50/50 opacity-70'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-900">{mod.title}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              mod.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              mod.status === 'current' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {mod.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{mod.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── DAILY REVISION VIEW ─── */}
                {activeView === 'revision' && (
                  <div key="revision" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-2xl mx-auto w-full">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-amber-100 text-xs font-semibold uppercase tracking-wider">
                            <Flame size={14} className="text-amber-200" /> Daily Revision Streak
                          </div>
                          <p className="text-3xl font-extrabold mt-1">7 Days</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <GraduationCap size={24} />
                        </div>
                      </div>
                      <p className="text-xs text-amber-100 mt-2">Retention score: 89% · 11 cards due today</p>
                    </div>

                    <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3">
                      <h4 className="text-xs font-bold text-gray-800">Today&apos;s Review Queue</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <span className="font-semibold text-gray-700">Gradient Descent & Learning Rate</span>
                          <span className="text-amber-600 font-bold">Due Now</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <span className="font-semibold text-gray-700">Backpropagation Chain Rule</span>
                          <span className="text-amber-600 font-bold">Due Now</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveView('flashcards')}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Zap size={13} /> Start Daily Session
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── PROGRESS VIEW ─── */}
                {activeView === 'progress' && (
                  <div key="progress" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-4 max-w-3xl">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-violet-200 uppercase tracking-wider">Knowledge Score</p>
                          <p className="text-3xl font-black mt-0.5">342 <span className="text-sm font-normal text-violet-200">/ 1000</span></p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                          <Target size={22} className="text-violet-200" />
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: progressAnimated ? '34.2%' : '0%' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: TrendingUp, label: 'Accuracy', value: '84%', color: 'text-emerald-600' },
                        { icon: Star, label: 'Active Streak', value: '7 days', color: 'text-amber-600' },
                        { icon: Clock, label: 'Cards Mastered', value: '56 cards', color: 'text-indigo-600' },
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon size={12} className={stat.color} />
                              <span className="text-[10px] font-semibold text-gray-400 uppercase">{stat.label}</span>
                            </div>
                            <p className="text-sm font-bold text-gray-800">{stat.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">5-Week Study Activity Heatmap</p>
                      <div className="flex gap-1.5">
                        {Array.from({ length: 5 }).map((_, week) => (
                          <div key={week} className="flex flex-col gap-1.5">
                            {Array.from({ length: 7 }).map((_, day) => {
                              const val = heatmapData[week]?.[day] ?? 0;
                              const intensity =
                                val === 0 ? 'bg-gray-100' :
                                val <= 2 ? 'bg-emerald-200' :
                                val <= 4 ? 'bg-emerald-300' :
                                val <= 6 ? 'bg-emerald-400' :
                                'bg-emerald-500';
                              return <div key={day} className={`w-3.5 h-3.5 rounded-sm ${intensity}`} />;
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── MENTOR VIEW ─── */}
                {activeView === 'mentor' && (
                  <div key="mentor" style={{ animation: 'fadeIn 0.25s ease-out' }} className="space-y-3 max-w-xl mx-auto w-full">
                    <div className="flex justify-start">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-md px-4 py-3 text-xs text-gray-800 max-w-[85%] shadow-xs">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GraduationCap size={13} className="text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-700">AI Mentor (Socratic Method)</span>
                        </div>
                        <p className="leading-relaxed">
                          Let&apos;s test your deeper understanding. What happens to the weight updates in deep layers when sigmoid activation is used across 10+ layers?
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-xs max-w-[85%] leading-relaxed shadow-xs">
                        The gradients become exponentially small as they propagate backward, causing the initial layers to stop updating their weights effectively.
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl rounded-bl-md px-4 py-3 text-xs text-gray-800 max-w-[85%] shadow-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">Evaluation: Correct</span>
                        </div>
                        <p className="leading-relaxed">
                          Spot on! This is the <strong>vanishing gradient problem</strong>. Why do residual skip connections in ResNets bypass this limitation?
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl mt-4">
                      <Sparkles size={14} className="text-indigo-600 flex-shrink-0" />
                      <span className="text-xs text-gray-400 flex-1">Reply to your mentor...</span>
                      <button className="p-1 rounded bg-indigo-600 text-white">
                        <Send size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
