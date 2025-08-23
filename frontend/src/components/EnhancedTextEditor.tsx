import React, { useState } from 'react';

interface EnhancedTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EnhancedTextEditor: React.FC<EnhancedTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Write your note here..." 
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [lastSelection, setLastSelection] = useState({ start: 0, end: 0 });

  // Enhanced markdown to HTML converter with proper link handling
  const renderMarkdown = (text: string): string => {
    if (!text) return '<p class="text-base-content/60 italic">Nothing to preview yet...</p>';
    
    let processedText = text;
    
    // Helper function to ensure URL has protocol
    const ensureProtocol = (url: string): string => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return 'https://' + url;
    };
    
    // Process in order to avoid conflicts
    
    // 1. Headers
    processedText = processedText
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // 2. Code blocks (must come before inline code and links)
    processedText = processedText
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 3. Markdown-style links [text](url) - process before auto-linking
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_, text, url) => {
      const fullUrl = ensureProtocol(url);
      return `<a href="${fullUrl}" class="link link-primary" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // 4. Auto-detect plain URLs (avoid URLs already in markdown links or code blocks)
    processedText = processedText.replace(
      /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<]*)?/gi,
      (match) => {
        return `<a href="${ensureProtocol(match)}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    );
    
    // 5. Auto-detect URLs starting with http/https
    processedText = processedText.replace(
      /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()https?:\/\/[^\s<]+/gi,
      (match) => {
        return `<a href="${match}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    );
    
    // 6. Bold and Italic
    processedText = processedText
      .replace(/\*\*([^*]+)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/gim, '<em class="italic">$1</em>');
    
    // 7. Blockquotes
    processedText = processedText
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 my-2 italic text-base-content/80">$1</blockquote>');
    
    // 8. Lists and Checkboxes
    processedText = processedText
      .replace(/^- \[ \] (.*$)/gim, '<li class="ml-4 flex items-center gap-2"><input type="checkbox" class="checkbox checkbox-sm" disabled> <span>$1</span></li>')
      .replace(/^- \[x\] (.*$)/gim, '<li class="ml-4 flex items-center gap-2"><input type="checkbox" class="checkbox checkbox-sm" checked disabled> <span class="line-through text-base-content/60">$1</span></li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal list-inside">$1</li>');
    
    // 9. Line breaks - preserve single breaks, avoid double spacing with block elements
    processedText = processedText.replace(/\n(?![</])/gim, '<br>');
    
    return processedText;
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('.enhanced-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    // Use stored selection if textarea has lost focus, otherwise use current selection
    const start = textarea === document.activeElement ? textarea.selectionStart : lastSelection.start;
    const end = textarea === document.activeElement ? textarea.selectionEnd : lastSelection.end;
    const selectedText = value.slice(start, end);
    const hasSelection = start !== end;
    
    const textToInsert = hasSelection ? selectedText : '';
    const newText = value.slice(0, start) + before + textToInsert + after + value.slice(end);
    onChange(newText);
    
    // Restore focus and cursor position after React re-renders
    setTimeout(() => {
      const updatedTextarea = document.querySelector('.enhanced-textarea') as HTMLTextAreaElement;
      if (updatedTextarea) {
        updatedTextarea.focus();
        if (hasSelection) {
          // Keep the formatted text selected
          updatedTextarea.setSelectionRange(start + before.length, start + before.length + textToInsert.length);
        } else {
          // Place cursor between the markdown syntax
          updatedTextarea.setSelectionRange(start + before.length, start + before.length);
        }
      }
    }, 0);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault(); // Prevent focus change and form submission
    e.stopPropagation(); // Stop event bubbling
    action();
  };

  const formatButtons = [
    { 
      icon: '**B**', 
      label: 'Bold', 
      action: () => insertMarkdown('**', '**'),
      className: 'font-bold',
      hasCheckbox: false
    },
    { 
      icon: '*I*', 
      label: 'Italic', 
      action: () => insertMarkdown('*', '*'),
      className: 'italic',
      hasCheckbox: false
    },
    { 
      icon: '</>', 
      label: 'Code', 
      action: () => insertMarkdown('`', '`'),
      className: 'font-mono text-xs',
      hasCheckbox: false
    },
    { 
      icon: '""', 
      label: 'Quote', 
      action: () => insertMarkdown('> '),
      className: '',
      hasCheckbox: false
    },
    { 
      icon: '•', 
      label: 'List', 
      action: () => insertMarkdown('- '),
      className: '',
      hasCheckbox: false
    },
    { 
      icon: '☐', 
      label: 'Checkbox', 
      action: () => insertMarkdown('- [ ] '),
      className: '',
      hasCheckbox: true
    },
  ];

  return (
    <div className="border border-base-300 rounded-lg bg-base-100 shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-base-200 border-b border-base-300 rounded-t-lg">
        <div className="flex items-center gap-1">
          {formatButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => handleButtonClick(e, btn.action)}
              className={`btn btn-xs btn-ghost border border-base-300 hover:bg-base-300 ${btn.className}`}
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
          
          <div className="mx-2 w-px h-4 bg-base-300"></div>
          
          <button
            type="button"
            onMouseDown={(e) => handleButtonClick(e, () => insertMarkdown('# '))}
            className="btn btn-xs btn-ghost border border-base-300 hover:bg-base-300 font-bold"
            title="Header"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => handleButtonClick(e, () => insertMarkdown('## '))}
            className="btn btn-xs btn-ghost border border-base-300 hover:bg-base-300 font-bold"
            title="Header 2"
          >
            H2
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsPreview(!isPreview);
            }}
            className={`btn btn-xs gap-1 ${
              isPreview 
                ? 'btn-primary' 
                : 'btn-ghost border border-base-300 hover:bg-base-300'
            }`}
            title={isPreview ? 'Edit' : 'Preview'}
          >
            {isPreview ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {isPreview ? (
          <div className="p-6 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] xl:min-h-[600px] bg-base-100">
            <div 
              className="prose prose-sm max-w-none text-base-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          </div>
        ) : (
          <textarea
            className="enhanced-textarea w-full min-h-[300px] sm:min-h-[500px] lg:min-h-[600px] xl:min-h-[700px] p-6 resize-none border-0 focus:outline-none bg-base-100 text-base-content font-mono text-sm leading-relaxed rounded-b-lg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setLastSelection({ start: target.selectionStart, end: target.selectionEnd });
            }}
            onBlur={(e) => {
              setLastSelection({ start: e.target.selectionStart, end: e.target.selectionEnd });
            }}
            placeholder={placeholder}
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace"
            }}
          />
        )}
      </div>

      {/* Help */}
      <div className="px-4 py-3 bg-base-200 border-t border-base-300 rounded-b-lg">
        <details className="text-xs text-base-content/60">
          <summary className="cursor-pointer hover:text-base-content select-none">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Markdown shortcuts
            </span>
          </summary>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">**bold**</kbd>
              <span className="text-xs">Bold</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">*italic*</kbd>
              <span className="text-xs">Italic</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">`code`</kbd>
              <span className="text-xs">Code</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content"># header</kbd>
              <span className="text-xs">Header</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">- list</kbd>
              <span className="text-xs">List</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">&gt; quote</kbd>
              <span className="text-xs">Quote</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd kbd-sm bg-base-300 text-base-content">- [ ]</kbd>
              <span className="text-xs">Checkbox</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-base-300">
            <p className="text-xs text-base-content/50">
              💡 Tip: URLs are automatically converted to clickable links
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default EnhancedTextEditor;