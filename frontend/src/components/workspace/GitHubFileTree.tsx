import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Loader2 } from 'lucide-react';
import { fetchGitHubFileTree, type FileTreeEntry } from '../../api/workspace';
import { detectLanguage } from '../../utils/languageUtils';

interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  size: number;
  language: string;
  children: TreeNode[];
}

function buildTree(entries: FileTreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated = accumulated ? `${accumulated}/${part}` : part;

      let node = map.get(accumulated);
      if (!node) {
        const isLast = i === parts.length - 1;
        node = {
          name: part,
          path: accumulated,
          type: isLast ? entry.type : 'tree',
          size: isLast ? entry.size : 0,
          language: isLast ? entry.language : '',
          children: [],
        };
        map.set(accumulated, node);
        current.push(node);
      }
      current = node.children;
    }
  }

  return root;
}

function TreeNodeItem({
  node,
  depth,
}: {
  node: TreeNode;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'tree') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-1 py-0.5 rounded text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800/30 w-full text-left transition-all"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <Folder size={10} className="text-amber-500 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5 rounded text-xs text-slate-500"
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <File size={10} className="text-slate-600 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
      {node.language && (
        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-500 flex-shrink-0 ml-auto">
          {node.language}
        </span>
      )}
    </div>
  );
}

export function GitHubFileTree({ sourceId }: { sourceId: string }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchGitHubFileTree(sourceId);
      setTree(buildTree(resp.file_tree));
    } catch {
      setError('Failed to load file tree');
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-3 py-1 text-xs text-slate-500">
        <Loader2 size={10} className="animate-spin" />
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-1 text-xs text-rose-400">{error}</div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-3 py-1 text-xs text-slate-600">No files</div>
    );
  }

  return (
    <div className="py-1">
      <div className="px-3 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
        Files ({tree.reduce((sum, n) => sum + countBlobs(n), 0)})
      </div>
      <div className="max-h-48 overflow-y-auto">
        {tree.map((node) => (
          <TreeNodeItem key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function countBlobs(node: TreeNode): number {
  if (node.type === 'blob') return 1;
  return node.children.reduce((sum, c) => sum + countBlobs(c), 0);
}
