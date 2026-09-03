import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { importYouTubeSource, importWebsiteSource, uploadDocument } from '../../api/workspace';

type Step = 'welcome' | 'workspace' | 'import' | 'done';

export function OnboardingWizard() {
  const { completeOnboarding } = useAuthStore();
  const { activeWorkspaceId, loadWorkspaces, loadFolderTree, workspaces, renameWorkspace, createWorkspace } = useWorkspaceStore();

  const [step, setStep] = useState<Step>('welcome');
  const [learningGoal, setLearningGoal] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [importMode, setImportMode] = useState<'youtube' | 'url' | 'file'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const stepIndex = { welcome: 0, workspace: 1, import: 2, done: 3 }[step];

  const handleWelcomeContinue = () => {
    if (!activeWorkspaceId) {
      loadWorkspaces();
    }
    setStep('workspace');
  };

  const handleWorkspaceContinue = async () => {
    const name = workspaceName.trim() || 'My Workspace';
    if (workspace) {
      if (workspace.name !== name) {
        await renameWorkspace(workspace.id, name);
      }
    } else {
      await createWorkspace(name);
    }
    setStep('import');
  };

  const handleImport = async () => {
    if (!activeWorkspaceId || importing) return;
    setImporting(true);
    setError(null);
    try {
      if (importMode === 'youtube' && youtubeUrl.trim()) {
        await importYouTubeSource(activeWorkspaceId, youtubeUrl.trim());
      } else if (importMode === 'url' && webUrl.trim()) {
        await importWebsiteSource(activeWorkspaceId, webUrl.trim());
      }
      setImportedCount((c) => c + 1);
      setYoutubeUrl('');
      setWebUrl('');
      await loadFolderTree(activeWorkspaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;
    setImporting(true);
    setError(null);
    try {
      await uploadDocument(activeWorkspaceId, file, file.name);
      setImportedCount((c) => c + 1);
      await loadFolderTree(activeWorkspaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  return (
    <main className="flex-1 flex flex-col bg-white">
      <header className="flex items-center justify-between pl-12 pr-4 py-4 lg:pl-8 sm:pr-8 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">Set up your workspace</span>
        {step !== 'done' && (
          <button
            onClick={handleFinish}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
          >
            Skip setup
          </button>
        )}
      </header>

      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                  i <= stepIndex ? 'bg-slate-800' : 'bg-slate-100'
                }`} />
              </div>
            ))}
          </div>

          {/* Step 1: Welcome */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Welcome to Scritur</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Turn any source into interactive knowledge. Import content, ask questions, and learn at your own pace.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  What do you want to learn?
                </label>
                <textarea
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="e.g., Machine learning, React, system design..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-0 resize-none transition-colors"
                />
                <p className="text-xs text-slate-400">Optional. Helps us personalize things.</p>
              </div>

              <button
                onClick={handleWelcomeContinue}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Name workspace */}
          {step === 'workspace' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Name your workspace</h1>
                <p className="text-sm text-slate-500 mt-2">
                  Workspaces hold all your sources, chats, and learning materials.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Workspace name
                </label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-0 transition-colors"
                />
              </div>

              <button
                onClick={handleWorkspaceContinue}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white rounded-lg transition-colors"
              >
                {workspaceName.trim() ? `Continue with "${workspaceName.trim()}"` : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 3: Import first source */}
          {step === 'import' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Add your first source</h1>
                <p className="text-sm text-slate-500 mt-2">
                  Import something you want to learn from. You can add more later.
                </p>
              </div>

              <div className="flex items-center border border-slate-200 rounded-lg p-0.5">
                {(['youtube', 'url', 'file'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setImportMode(mode)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                      importMode === mode
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'youtube' ? 'YouTube' : mode === 'url' ? 'Website' : 'File'}
                  </button>
                ))}
              </div>

              {importMode === 'youtube' && (
                <div className="space-y-2">
                  <input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                  <button
                    onClick={handleImport}
                    disabled={importing || !youtubeUrl.trim()}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-sm font-medium text-white rounded-lg transition-colors"
                  >
                    {importing ? 'Importing...' : 'Import video'}
                  </button>
                </div>
              )}

              {importMode === 'url' && (
                <div className="space-y-2">
                  <input
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                  <button
                    onClick={handleImport}
                    disabled={importing || !webUrl.trim()}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-sm font-medium text-white rounded-lg transition-colors"
                  >
                    {importing ? 'Importing...' : 'Import website'}
                  </button>
                </div>
              )}

              {importMode === 'file' && (
                <div>
                  <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">Choose a file</p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF, DOCX, PPTX, TXT, or MD</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              {importedCount > 0 && (
                <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg text-center">
                  {importedCount} source{importedCount !== 1 ? 's' : ''} added
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                {importedCount > 0 ? (
                  <button
                    onClick={() => setStep('done')}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white rounded-lg transition-colors"
                  >
                    Continue with {importedCount} source{importedCount !== 1 ? 's' : ''}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep('done')}
                    className="w-full py-2.5 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Skip — I'll add sources later
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-6">
              <div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-slate-900">You're all set</h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {workspaceName || 'My Workspace'} is ready. Here's what you can do next.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Ask questions about your sources', desc: 'Start a chat and get answers based on your content.' },
                  { label: 'Create flashcards', desc: 'Turn any source into study cards with spaced repetition.' },
                  { label: 'Import more sources', desc: 'Add websites, PDFs, documents, and GitHub repos.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-slate-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white rounded-lg transition-colors"
              >
                Go to dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
