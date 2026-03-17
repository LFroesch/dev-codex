import React, { useState } from 'react';
import AIActionPreview from './AIActionPreview';
import { AIAction, AIResponseData } from '../../api/terminal';
import { renderMarkdown } from '../../utils/renderMarkdown';

/** Detect which entity types are relevant from AI message + followUp text */
function detectReferencedEntities(text: string): Set<string> {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  if (/\b(note|notes)\b/.test(lower)) found.add('notes');
  if (/\b(todo|todos|task|tasks)\b/.test(lower)) found.add('todos');
  if (/\b(devlog|dev log|dev-log|log|logs|journal)\b/.test(lower)) found.add('devlog');
  if (/\b(feature|features|component|components)\b/.test(lower)) found.add('features');
  if (/\b(stack|tech|package|library|framework|tool|dependency)\b/.test(lower)) found.add('stack');
  if (/\b(idea|ideas)\b/.test(lower)) found.add('ideas');
  return found;
}

/** Render a compact list of project entities for context */
function EntityContextPanel({ entities, project }: { entities: Set<string>; project: any }) {
  const sections: React.ReactNode[] = [];

  if (entities.has('notes') && project.notes?.length > 0) {
    sections.push(
      <div key="notes">
        <div className="text-xs font-semibold text-base-content/50 mb-1">Notes ({project.notes.length})</div>
        {project.notes.map((n: any, i: number) => (
          <div key={n._id || i} className="text-xs text-base-content/70 py-0.5 flex gap-1.5">
            <span className="text-base-content/40 font-mono shrink-0">#{i + 1}</span>
            <span className="font-medium">{n.title}</span>
            {n.content && <span className="text-base-content/40 truncate">— {n.content.slice(0, 80)}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (entities.has('todos') && project.todos?.length > 0) {
    sections.push(
      <div key="todos">
        <div className="text-xs font-semibold text-base-content/50 mb-1">Todos ({project.todos.length})</div>
        {project.todos.map((t: any, i: number) => (
          <div key={t._id || i} className="text-xs text-base-content/70 py-0.5 flex gap-1.5">
            <span className="text-base-content/40 font-mono shrink-0">#{i + 1}</span>
            <span className={`shrink-0 ${t.status === 'completed' ? 'text-success' : t.status === 'in_progress' ? 'text-info' : 'text-base-content/40'}`}>
              [{t.status || 'not_started'}]
            </span>
            <span className="font-medium">{t.title}</span>
          </div>
        ))}
      </div>
    );
  }

  if (entities.has('devlog') && project.devLog?.length > 0) {
    const sorted = [...project.devLog].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    sections.push(
      <div key="devlog">
        <div className="text-xs font-semibold text-base-content/50 mb-1">Dev Log ({project.devLog.length})</div>
        {sorted.map((d: any, i: number) => (
          <div key={d._id || i} className="text-xs text-base-content/70 py-0.5 flex gap-1.5">
            <span className="text-base-content/40 font-mono shrink-0">#{i + 1}</span>
            <span className="text-base-content/40 shrink-0">{new Date(d.date).toLocaleDateString()}</span>
            <span className="font-medium">{d.title || 'Untitled'}</span>
            {d.description && <span className="text-base-content/40 truncate">— {d.description.slice(0, 60)}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (entities.has('features') && project.features?.length > 0) {
    sections.push(
      <div key="features">
        <div className="text-xs font-semibold text-base-content/50 mb-1">Features ({project.features.length})</div>
        {project.features.map((f: any, i: number) => (
          <div key={f._id || f.id || i} className="text-xs text-base-content/70 py-0.5 flex gap-1.5">
            <span className="text-base-content/40 font-mono shrink-0">#{i + 1}</span>
            <span className="text-base-content/40 shrink-0">{f.category}/{f.type}</span>
            <span className="font-medium">{f.title}</span>
            {f.group && <span className="text-base-content/40">[{f.group}]</span>}
          </div>
        ))}
      </div>
    );
  }

  if (entities.has('stack') && project.stack?.length > 0) {
    sections.push(
      <div key="stack">
        <div className="text-xs font-semibold text-base-content/50 mb-1">Tech Stack ({project.stack.length})</div>
        {project.stack.map((s: any, i: number) => (
          <div key={i} className="text-xs text-base-content/70 py-0.5 flex gap-1.5">
            <span className="font-medium">{s.name}</span>
            {s.version && <span className="text-base-content/40">v{s.version}</span>}
            {s.category && <span className="text-base-content/40">({s.category})</span>}
          </div>
        ))}
      </div>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="mx-4 mb-3 px-3 py-2.5 rounded-lg bg-base-200/60 border border-base-content/10 space-y-2 max-h-48 overflow-y-auto">
      {sections}
    </div>
  );
}

interface AIResponseRendererProps {
  aiResponse: AIResponseData;
  currentProjectId?: string;
  onConfirm: (actions: AIAction[]) => void;
  onCancel: () => void;
  onRetry?: () => void;
  fromStorage?: boolean;
  selectedProject?: any;
}

const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({
  aiResponse,
  currentProjectId,
  onConfirm,
  onCancel,
  onRetry,
  fromStorage,
  selectedProject,
}) => {
  const { message, followUp, tokensUsed, elapsed, model } = aiResponse;
  // Filter out malformed actions (empty summary or command)
  const actions = (aiResponse.actions || []).filter(a => a.summary && a.command);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(
    () => new Set(actions.map((_, i) => i))
  );
  // If loaded from storage, treat actions as already handled (no re-confirm)
  const [confirmed, setConfirmed] = useState(fromStorage && actions.length > 0);
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const toggleAction = (index: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (confirming) return;
    const selected = actions.filter((_, i) => checkedActions.has(i));
    if (selected.length > 0) {
      setConfirming(true);
      setConfirmed(true);
      onConfirm(selected);
    }
  };

  const handleCancel = () => {
    setDismissed(true);
    onCancel();
  };

  const selectedCount = checkedActions.size;

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Show entity context panel whenever the AI references an entity type
  const referencedEntities = selectedProject
    ? detectReferencedEntities(`${message} ${followUp || ''}`)
    : new Set<string>();
  const showContextPanel = selectedProject && referencedEntities.size > 0;

  return (
    <div className="mt-3 rounded-lg border-thick border-accent/50 bg-accent/8 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20">
        <span className="text-base font-bold">AI</span>
        <span className="text-sm text-base-content/60 font-mono">Dev Codex AI</span>
        {(model || tokensUsed || elapsed) && (
          <span className="ml-auto flex items-center gap-1.5 text-sm text-base-content/30">
            {model && <span>{model}</span>}
            {model && (tokensUsed || elapsed) && <span>·</span>}
            {tokensUsed && <span>{tokensUsed.total} tok</span>}
            {tokensUsed && elapsed && <span>·</span>}
            {elapsed && <span>{formatElapsed(elapsed)}</span>}
          </span>
        )}
      </div>

      {/* Message — rendered as markdown */}
      <div className="px-4 py-3">
        <div
          className="text-base text-base-content/90 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }}
        />
      </div>

      {/* Actions — active state */}
      {actions.length > 0 && !confirmed && !dismissed && (
        <div className="px-4 pb-3 space-y-2">
          <div className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">
            Proposed Actions
          </div>

          <div className="space-y-1.5">
            {actions.map((action, index) => (
              <AIActionPreview
                key={index}
                icon={action.icon}
                summary={action.summary}
                command={action.command}
                checked={checkedActions.has(index)}
                onToggle={() => toggleAction(index)}
              />
            ))}
          </div>

          {/* Confirm / Cancel */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || confirming}
              className="btn btn-sm btn-primary border-thick"
            >
              {confirming ? 'Executing...' : `Confirm ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-sm btn-ghost border-thick"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmed state */}
      {confirmed && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-success font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {selectedCount} action{selectedCount !== 1 ? 's' : ''} confirmed
          </div>
        </div>
      )}

      {/* Dismissed state */}
      {dismissed && actions.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs text-base-content/40">
            {actions.length} action{actions.length !== 1 ? 's' : ''} dismissed
          </div>
        </div>
      )}

      {/* Entity context panel — shows items from project data so user can reference by # */}
      {showContextPanel && (
        <EntityContextPanel entities={referencedEntities} project={selectedProject} />
      )}

      {/* Follow-up — AI needs specific info to proceed */}
      {followUp && (
        <div className="mx-4 mb-3 mt-1 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/30">
          <div className="flex items-start gap-2">
            <span className="text-warning text-base flex-shrink-0 mt-0.5">?</span>
            <div className="text-sm text-base-content/90 font-medium leading-relaxed">
              {followUp}
            </div>
          </div>
        </div>
      )}

      {/* Retry button — shown on responses with no actions (errors, bad responses) */}
      {!fromStorage && onRetry && actions.length === 0 && !followUp && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-xs btn-ghost text-base-content/50 border border-base-content/15 gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      )}

    </div>
  );
};

export default AIResponseRenderer;
