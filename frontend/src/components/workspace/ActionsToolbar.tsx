import { useState } from 'react';
import { Loader2, X, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import {
  runAction,
  AI_ACTIONS, AI_ACTION_LABELS,
  type AIActionType,
} from '../../api/workspace';

interface ActionModalProps {
  actionType: AIActionType;
  onClose: () => void;
}

function ActionModal({ actionType, onClose }: ActionModalProps) {
  const activeSourceId = useWorkspaceStore((s) => s.activeSourceId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { addMessage, setStreaming } = useChatSessionStore();

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Param inputs
  const [concept, setConcept] = useState('');
  const [concept1, setConcept1] = useState('');
  const [concept2, setConcept2] = useState('');
  const [language, setLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');

  const needsConcept = ['explain', 'examples'].includes(actionType);
  const needsCompare = actionType === 'compare';
  const needsLanguage = actionType === 'translate';
  const needsTopic = actionType === 'expand';
  const needsDescription = actionType === 'code';

  const handleRun = async () => {
    if (!activeSourceId || !activeWorkspaceId) return;
    setRunning(true);
    setError(null);

    const userMsg = {
      role: 'user' as const,
      content: `/${actionType}${concept ? ` ${concept}` : ''}${language ? ` (→${language})` : ''}`,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setStreaming(true);

    try {
      const res = await runAction({
        source_id: activeSourceId,
        action_type: actionType,
        concept: concept || undefined,
        concept1: concept1 || undefined,
        concept2: concept2 || undefined,
        language: language || undefined,
        topic: topic || undefined,
        description: description || undefined,
      });
      addMessage({
        role: 'assistant',
        content: `**${AI_ACTION_LABELS[actionType]}** for **${res.source_title}**\n\n${res.content}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || 'Action failed');
      addMessage({
        role: 'assistant',
        content: `**${AI_ACTION_LABELS[actionType]}** failed: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setStreaming(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm mx-4 p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{AI_ACTION_LABELS[actionType]}</h3>
          <button onClick={onClose} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {needsConcept && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Concept</label>
              <input
                autoFocus
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="What concept?"
                onKeyDown={(e) => e.key === 'Enter' && concept.trim() && handleRun()}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400"
              />
            </div>
          )}
          {needsCompare && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Concept 1</label>
                <input
                  autoFocus
                  value={concept1}
                  onChange={(e) => setConcept1(e.target.value)}
                  placeholder="First concept"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Concept 2</label>
                <input
                  value={concept2}
                  onChange={(e) => setConcept2(e.target.value)}
                  placeholder="Second concept"
                  onKeyDown={(e) => e.key === 'Enter' && concept1.trim() && concept2.trim() && handleRun()}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400"
                />
              </div>
            </>
          )}
          {needsLanguage && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Language</label>
              <input
                autoFocus
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. Spanish, French, Japanese..."
                onKeyDown={(e) => e.key === 'Enter' && language.trim() && handleRun()}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400"
              />
            </div>
          )}
          {needsTopic && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Topic to expand</label>
              <input
                autoFocus
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Which topic to elaborate?"
                onKeyDown={(e) => e.key === 'Enter' && topic.trim() && handleRun()}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400"
              />
            </div>
          )}
          {needsDescription && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Description</label>
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What code should be generated?"
                rows={3}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 resize-none"
              />
            </div>
          )}
          {actionType === 'simplify' && (
            <p className="text-xs text-gray-500">No additional params needed. Click Run to simplify this source.</p>
          )}
          {actionType === 'quiz' && (
            <p className="text-xs text-gray-500">No additional params needed. Click Run to generate a quiz from this source.</p>
          )}
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex items-center justify-end gap-1.5">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {running ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActionsToolbar() {
  const activeSourceId = useWorkspaceStore((s) => s.activeSourceId);
  const [activeAction, setActiveAction] = useState<AIActionType | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  if (!activeSourceId) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
          title="AI Actions"
        >
          <Sparkles size={12} />
          Actions
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
              {AI_ACTIONS.map((actionType) => (
                <button
                  key={actionType}
                  onClick={() => {
                    setActiveAction(actionType);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles size={10} className="text-amber-500" />
                  {AI_ACTION_LABELS[actionType]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {activeAction && (
        <ActionModal
          actionType={activeAction}
          onClose={() => setActiveAction(null)}
        />
      )}
    </>
  );
}


