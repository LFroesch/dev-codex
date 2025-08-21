import React, { useState } from 'react';
import type { ExportFormat } from '../../utils/exportGenerators';

interface ExportResultProps {
  exportedData: string;
  format: ExportFormat;
  projectName: string;
  onClose: () => void;
}

const ExportResult: React.FC<ExportResultProps> = ({
  exportedData,
  format,
  projectName,
  onClose
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedData);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = () => {
    const extension = format === 'markdown' ? 'md' : format === 'prompt' ? 'txt' : 'json';
    const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-export.${extension}`;
    const blob = new Blob([exportedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatIcon = {
    json: '{}',
    prompt: '🤖',
    markdown: '#'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Export Result</span>
          <span className="badge badge-primary badge-sm">
            {formatIcon[format]} {format.toUpperCase()}
          </span>
          <span className="text-xs text-base-content/60">
            {exportedData.length.toLocaleString()} characters
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={copyToClipboard}
          className={`btn btn-sm gap-2 ${copySuccess ? 'btn-success' : 'btn-outline'}`}
        >
          {copySuccess ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
        
        <button
          onClick={downloadFile}
          className="btn btn-outline btn-sm gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </button>
      </div>

      <div className="mockup-code bg-neutral text-neutral-content rounded-lg">
        <div className="bg-neutral-focus px-3 py-2 rounded-t-lg border-b border-neutral-content/20">
          <div className="flex items-center gap-2 text-xs text-neutral-content/70">
            <span>Preview</span>
            <span className="badge badge-xs badge-neutral">
              {format === 'json' ? 'JSON Format' : 
               format === 'prompt' ? 'AI Assistant Ready' : 
               'Markdown Format'}
            </span>
          </div>
        </div>
        
        <div className="p-4 max-h-96 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed text-neutral-content">
            {exportedData}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ExportResult;