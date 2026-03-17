import React, { useState } from 'react';

interface Command {
  syntax: string;
  simpleSyntax?: string;
  description: string;
  examples?: string[];
  type?: string;
}

interface HelpRendererProps {
  grouped: Record<string, Command[]>;
  onCommandClick?: (command: string) => void;
  generateTemplate: (syntax: string) => string;
}

// Color accents per section for visual differentiation
const sectionColors: Record<string, string> = {
  '1': 'border-primary/40 bg-primary/5 hover:bg-primary/10',
  '2': 'border-info/40 bg-info/5 hover:bg-info/10',
  '3': 'border-success/40 bg-success/5 hover:bg-success/10',
  '4': 'border-warning/40 bg-warning/5 hover:bg-warning/10',
  '5': 'border-secondary/40 bg-secondary/5 hover:bg-secondary/10',
  '6': 'border-accent/40 bg-accent/5 hover:bg-accent/10',
  '7': 'border-error/40 bg-error/5 hover:bg-error/10',
  '8': 'border-primary/40 bg-primary/5 hover:bg-primary/10',
  '9': 'border-info/40 bg-info/5 hover:bg-info/10',
};

const HelpRenderer: React.FC<HelpRendererProps> = ({ grouped, onCommandClick, generateTemplate }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [expandedCmd, setExpandedCmd] = useState<string | null>(null);

  const toggleSection = (category: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
    setExpandedCmd(null);
  };

  const getSectionKey = (category: string) => category.charAt(0);

  return (
    <div className="mt-3 space-y-1.5">
      {Object.entries(grouped).map(([category, cmds]) => {
        if (cmds.length === 0) return null;
        const sectionKey = getSectionKey(category);
        const isOpen = openSections.has(category);
        const headerClass = sectionColors[sectionKey] || 'border-base-content/20 bg-base-200 hover:bg-base-300';
        // Strip the number prefix for display (e.g., "1. ⚡ Getting Started" → "⚡ Getting Started")
        const displayName = category.replace(/^\d+\.\s*/, '');

        return (
          <div key={category} className="overflow-hidden">
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(category)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between border-thick rounded-lg transition-colors ${headerClass} ${isOpen ? 'rounded-b-none' : ''} ${sectionKey === '1' ? 'border-l-4 border-l-primary' : ''}`}
            >
              <span className="text-base font-bold text-base-content">
                {displayName}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/40">{cmds.length}</span>
                <svg
                  className={`w-3.5 h-3.5 text-base-content/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Section content */}
            {isOpen && (
              <div className="px-4 pb-3 pt-2 border-thick border-t-0 border-base-content/10 rounded-b-lg">
                {/* Syntax tips (Getting Started section) */}
                {cmds.filter(c => c.type === 'syntax_tip').length > 0 && (
                  <div className="space-y-2.5 mb-3">
                    {cmds.filter(c => c.type === 'syntax_tip').map((cmd, i) => (
                      <div key={i} className="rounded-lg border border-base-content/10 bg-base-200/40 overflow-hidden">
                        <div className="px-3.5 py-2.5">
                          <div className="text-base font-semibold text-base-content">
                            {cmd.syntax}
                          </div>
                          <div className="text-sm text-base-content/55 mt-0.5">
                            {cmd.description}
                          </div>
                        </div>
                        {cmd.examples && cmd.examples.length > 0 && (
                          <div className="border-t border-base-content/5 bg-base-100/50 px-3.5 py-2 space-y-1.5">
                            {cmd.examples.map((ex, j) => {
                              // Split "command → description" or "command - description"
                              const sepMatch = ex.match(/^(.+?)\s*(?:→|–|—|-)\s+(.+)$/);
                              const cmdPart = sepMatch ? sepMatch[1].trim() : ex;
                              const descPart = sepMatch ? sepMatch[2].trim() : null;
                              const isClickable = cmdPart.startsWith('/') || cmdPart.startsWith('"');

                              return (
                                <div key={j} className="flex items-start gap-2">
                                  {isClickable ? (
                                    <button
                                      type="button"
                                      onClick={() => onCommandClick?.(generateTemplate(cmdPart.replace(/^"|"$/g, '')))}
                                      className="font-mono text-sm bg-base-200 text-base-content/80 px-2 py-0.5 rounded border border-base-content/12 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer flex-shrink-0"
                                      title="Click to paste"
                                    >
                                      {cmdPart}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-base-content/50 flex-shrink-0">{cmdPart}</span>
                                  )}
                                  {descPart && (
                                    <span className="text-sm text-base-content/40 pt-0.5">{descPart}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Regular commands - clean rows */}
                {cmds.filter(c => c.type !== 'syntax_tip').length > 0 && (
                  <div className="rounded-lg border border-base-content/10 divide-y divide-base-content/5 overflow-hidden">
                    {cmds.filter(c => c.type !== 'syntax_tip').map((cmd, index) => {
                      const cmdKey = `${category}-${index}`;
                      const isExpanded = expandedCmd === cmdKey;
                      const hasExamples = cmd.examples && cmd.examples.length > 0;

                      return (
                        <div key={index} className="bg-base-100">
                          <div
                            className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                              hasExamples ? 'hover:bg-base-200/60 cursor-pointer' : ''
                            } ${isExpanded ? 'bg-base-200/40' : ''}`}
                            onClick={() => hasExamples && setExpandedCmd(isExpanded ? null : cmdKey)}
                          >
                            {/* Command badge */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCommandClick?.(generateTemplate(cmd.syntax));
                              }}
                              className="font-mono text-sm bg-base-200 text-base-content/80 px-2.5 py-0.5 rounded border border-base-content/15 hover:border-primary/50 hover:text-primary transition-colors flex-shrink-0"
                              title="Click to use"
                            >
                              {cmd.simpleSyntax || cmd.syntax}
                            </button>
                            {/* Description */}
                            <span className="text-sm text-base-content/55 flex-1 truncate">
                              {cmd.description}
                            </span>
                            {/* Expand indicator */}
                            {hasExamples && (
                              <svg
                                className={`w-3 h-3 text-base-content/30 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </div>
                          {/* Expanded examples */}
                          {isExpanded && hasExamples && (
                            <div className="mx-3 mb-2 pl-3 border-l-2 border-base-content/10 py-1.5 space-y-1">
                              <div className="text-xs uppercase tracking-wider text-base-content/40 font-semibold">
                                Syntax
                              </div>
                              <button
                                type="button"
                                onClick={() => onCommandClick?.(generateTemplate(cmd.syntax))}
                                className="block text-sm font-mono text-base-content/60 hover:text-primary transition-colors cursor-pointer"
                              >
                                {cmd.syntax}
                              </button>
                              <div className="text-xs uppercase tracking-wider text-base-content/40 font-semibold mt-2">
                                Examples
                              </div>
                              {cmd.examples!.map((example, exIdx) => (
                                <button
                                  key={exIdx}
                                  type="button"
                                  onClick={() => onCommandClick?.(generateTemplate(example))}
                                  className="block text-sm text-base-content/55 hover:text-primary transition-colors cursor-pointer"
                                >
                                  {example}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HelpRenderer;
