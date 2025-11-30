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

const HelpRenderer: React.FC<HelpRendererProps> = ({ grouped, onCommandClick, generateTemplate }) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openCommand, setOpenCommand] = useState<string | null>(null);

  const toggleSection = (category: string) => {
    setOpenSection(prev => prev === category ? null : category);
    setOpenCommand(null);
  };

  const toggleCommand = (commandKey: string) => {
    setOpenCommand(prev => prev === commandKey ? null : commandKey);
  };

  return (
    <div className="mt-3 space-y-2">
      {Object.entries(grouped).map(([category, cmds]) => (
        cmds.length > 0 && (
          <div key={category} className="border-thick rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(category)}
              className="w-full text-left p-3 flex items-center justify-between bg-base-200 hover:bg-base-300/50 transition-colors"
            >
              <div className="text-sm font-semibold text-base-content">
                {category} ({cmds.length})
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${openSection === category ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === category && (
              <div className="mt-3 px-3 pb-3 bg-base-100 space-y-1">
                {cmds.map((cmd, index) => {
                  const commandKey = `${category}-${index}`;
                  const isOpen = openCommand === commandKey;
                  const isSyntaxTip = cmd.type === 'syntax_tip';

                  return (
                    <div key={index} className="border-thick rounded-lg overflow-hidden bg-base-200/50">
                      <button
                        type="button"
                        onClick={() => !isSyntaxTip && toggleCommand(commandKey)}
                        className={`w-full text-left p-2 flex items-start justify-between ${
                          isSyntaxTip ? 'cursor-default' : 'hover:bg-base-300/30 cursor-pointer'
                        } transition-colors`}
                      >
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          {isSyntaxTip ? (
                            <div className="text-xs font-semibold text-base-content/70 font-mono">
                              {cmd.syntax} -
                            </div>
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onCommandClick?.(generateTemplate(cmd.syntax));
                              }}
                              className="text-xs text-base-content/70 font-mono bg-base-100 px-1.5 py-0.5 rounded hover:border-primary border-thick transition-colors cursor-pointer w-fit"
                              title="Click to use this command"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onCommandClick?.(generateTemplate(cmd.syntax));
                                }
                              }}
                            >
                              {cmd.simpleSyntax || cmd.syntax}
                            </span>
                          )}
                          <div className="text-xs text-base-content/70 break-words flex-1">
                            {cmd.description}
                          </div>
                        </div>
                        {!isSyntaxTip && cmd.examples && cmd.examples.length > 0 && (
                          <svg
                            className={`w-3 h-3 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                      {!isSyntaxTip && isOpen && cmd.examples && cmd.examples.length > 0 && (
                        <div className="px-3 pb-2 bg-base-100/50 space-y-1">
                          <div className="mt-1 text-xs font-semibold text-base-content/60 mb-1">
                            Full syntax:
                          </div>
                          <button
                            type="button"
                            onClick={() => onCommandClick?.(generateTemplate(cmd.syntax))}
                            className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded border-thick text-base-content/70 font-mono mb-2 hover:bg-base-300/50 cursor-pointer transition-colors"
                            title="Click to use this command"
                          >
                            {cmd.syntax}
                          </button>
                          <div className="mt-1 text-xs font-semibold text-base-content/60 mb-1">
                            Examples:
                          </div>
                          {cmd.examples.map((example, exIdx) => (
                            <button
                              key={exIdx}
                              type="button"
                              onClick={() => onCommandClick?.(generateTemplate(example))}
                              className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded border-thick hover:bg-base-300/50 cursor-pointer transition-colors text-base-content/70"
                              title="Click to use this example"
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      )}
                      {isSyntaxTip && cmd.examples && cmd.examples.length > 0 && (
                        <div className="px-3 pb-2 bg-base-100/50 space-y-1">
                          {cmd.examples.map((example, exIdx) => (
                            <div
                              key={exIdx}
                              className="text-xs bg-base-200 px-2 py-1 rounded border-thick text-base-content/70"
                            >
                              {example}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ))}
    </div>
  );
};

export default HelpRenderer;
