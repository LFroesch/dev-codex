import React, { useState } from 'react';
import type { Project } from '../api/types';
import BackupImportExport from './export/BackupImportExport';
import ExportOptionsSelector from './export/ExportOptionsSelector';
import ExportResult from './export/ExportResult';
import { 
  generateExportData, 
  formatExportData, 
  type ExportOptions, 
  type ExportFormat 
} from '../utils/exportGenerators';

interface ExportSectionProps {
  selectedProject: Project;
  onProjectRefresh?: () => void;
}

const ExportSection: React.FC<ExportSectionProps> = ({ selectedProject, onProjectRefresh }) => {
  // Export configuration state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    description: true,
    tags: true,
    links: false,
    notes: false,
    todos: false,
    devLog: false,
    components: false,
    techStack: false,
    team: false,
    deploymentData: false,
    publicPageData: false,
    settings: false,
    timestamps: false,
  });

  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [customAiRequest, setCustomAiRequest] = useState<string>('');
  
  // Export result state
  const [exportedData, setExportedData] = useState<string>('');
  const [showExportResult, setShowExportResult] = useState(false);

  const toggleOption = (key: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAll = (value: boolean) => {
    setExportOptions(prev => 
      Object.keys(prev).reduce((acc, key) => ({
        ...acc,
        [key]: value
      }), {} as ExportOptions)
    );
  };

  const generateExport = () => {
    try {
      const data = generateExportData(selectedProject, exportOptions);
      const output = formatExportData(data, exportFormat, selectedProject, customAiRequest);
      setExportedData(output);
      setShowExportResult(true);
    } catch (error) {
      console.error('Export generation error:', error);
      setExportedData(`Error generating export: ${error}`);
      setShowExportResult(true);
    }
  };

  const selectedCount = Object.values(exportOptions).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-base-content/60">
          Export creates a full backup of all project data. Import creates a new project from backup file (keeps your original safe).
        </p>
      </div>

      {/* Complete Backup Section */}
      <BackupImportExport 
        selectedProject={selectedProject} 
        onProjectRefresh={onProjectRefresh} 
      />

      <div className="divider text-xs">Custom Export</div>

      {/* Custom AI Request - Only show for prompt format */}
      {exportFormat === 'prompt' && (
        <div className="bg-base-200/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">🤖 AI Assistant Request</h4>
          <textarea
            value={customAiRequest}
            onChange={(e) => setCustomAiRequest(e.target.value)}
            placeholder="What do you need help with? (Optional - leave empty for a general template)"
            className="textarea textarea-bordered w-full text-sm"
            rows={3}
          />
          <p className="text-xs text-base-content/60">
            💡 Tip: Be specific about what you need help with (e.g., "Review my React components for performance issues" or "Help me implement user authentication")
          </p>
        </div>
      )}

      {/* Export Options */}
      <ExportOptionsSelector
        options={exportOptions}
        onToggleOption={toggleOption}
        onToggleAll={toggleAll}
      />

      {/* Format Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Format:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="select select-bordered select-sm"
          >
            <option value="json">JSON</option>
            <option value="prompt">AI Prompt</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        <p className="text-sm font-semibold text-base-content/60">
        JSON for data backup, AI Prompt to help with assistance, Markdown for documentation
        </p>
      </div>

      {/* Selection Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => toggleAll(true)}
          className="btn btn-outline btn-sm"
        >
          Select All
        </button>
        <button
          onClick={() => toggleAll(false)}
          className="btn btn-outline btn-sm"
        >
          Clear All
        </button>
      </div>

      {/* Generate Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          onClick={generateExport}
          disabled={selectedCount === 0}
          className="btn btn-primary gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {showExportResult ? 'Regenerate Export' : 'Generate Export'}
        </button>
        
        {selectedCount === 0 && (
          <span className="text-sm text-base-content/60">
            Select at least one data type to export
          </span>
        )}
      </div>

      {/* Export Result */}
      {showExportResult && (
        <ExportResult
          exportedData={exportedData}
          format={exportFormat}
          projectName={selectedProject.name}
          onClose={() => setShowExportResult(false)}
        />
      )}
    </div>
  );
};

export default ExportSection;