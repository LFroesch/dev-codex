import React, { useState } from 'react';
import { Project } from '../api/client';

interface ExportSectionProps {
  selectedProject: Project;
}

interface ExportOptions {
  basicInfo: boolean;
  description: boolean;
  tags: boolean;
  links: boolean;
  notes: boolean;
  roadmap: boolean;
  docs: boolean;
  deploymentData: boolean;
  publicPageData: boolean;
  timestamps: boolean;
}

const ExportSection: React.FC<ExportSectionProps> = ({ selectedProject }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    description: true,
    tags: true,
    links: true,
    notes: false,
    roadmap: false,
    docs: false,
    deploymentData: false,
    publicPageData: false,
    timestamps: false,
  });

  const [exportFormat, setExportFormat] = useState<'json' | 'prompt' | 'markdown'>('json');
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
    const data: any = {};

    if (exportOptions.basicInfo) {
      data.basicInfo = {
        name: selectedProject.name,
        category: selectedProject.category,
        stagingEnvironment: selectedProject.stagingEnvironment,
        color: selectedProject.color,
      };
    }

    if (exportOptions.description && selectedProject.description) {
      data.description = selectedProject.description;
    }

    if (exportOptions.tags && selectedProject.tags?.length) {
      data.tags = selectedProject.tags;
    }

    if (exportOptions.links && selectedProject.links?.length) {
      data.links = selectedProject.links;
    }

    if (exportOptions.notes && selectedProject.notes?.length) {
      data.notes = selectedProject.notes;
    }

    if (exportOptions.roadmap && selectedProject.roadmapItems?.length) {
      data.roadmap = selectedProject.roadmapItems;
    }

    if (exportOptions.docs && selectedProject.docs?.length) {
      data.docs = selectedProject.docs;
    }

    if (exportOptions.deploymentData && selectedProject.deploymentData) {
      data.deploymentData = selectedProject.deploymentData;
    }

    if (exportOptions.publicPageData && selectedProject.publicPageData) {
      data.publicPageData = selectedProject.publicPageData;
    }

    if (exportOptions.timestamps) {
      data.timestamps = {
        createdAt: selectedProject.createdAt,
        updatedAt: selectedProject.updatedAt,
      };
    }

    let output = '';

    switch (exportFormat) {
      case 'json':
        output = JSON.stringify(data, null, 2);
        break;
      
      case 'prompt':
        output = generatePromptFormat(data);
        break;
      
      case 'markdown':
        output = generateMarkdownFormat(data);
        break;
    }

    setExportedData(output);
    setShowExportResult(true);
  };

  const generatePromptFormat = (data: any): string => {
    let prompt = `Here's information about my project "${selectedProject.name}":\n\n`;

    if (data.basicInfo) {
      prompt += `Basic Information:\n`;
      prompt += `- Name: ${data.basicInfo.name}\n`;
      if (data.basicInfo.category) prompt += `- Category: ${data.basicInfo.category}\n`;
      if (data.basicInfo.stagingEnvironment) prompt += `- Environment: ${data.basicInfo.stagingEnvironment}\n`;
      prompt += `\n`;
    }

    if (data.description) {
      prompt += `Description:\n${data.description}\n\n`;
    }

    if (data.tags?.length) {
      prompt += `Tags: ${data.tags.join(', ')}\n\n`;
    }

    if (data.links?.length) {
      prompt += `Project Links:\n`;
      data.links.forEach((link: any) => {
        prompt += `- ${link.title}: ${link.url} (${link.type})\n`;
      });
      prompt += `\n`;
    }

    if (data.notes?.length) {
      prompt += `Notes:\n`;
      data.notes.forEach((note: any) => {
        prompt += `- ${note.title}: ${note.content}\n`;
      });
      prompt += `\n`;
    }

    if (data.roadmap?.length) {
      prompt += `Roadmap/Progress:\n`;
      data.roadmap.forEach((item: any) => {
        prompt += `- [${item.status}] ${item.title}: ${item.description}\n`;
      });
      prompt += `\n`;
    }

    if (data.docs?.length) {
      prompt += `Documentation:\n`;
      data.docs.forEach((doc: any) => {
        prompt += `- ${doc.title}: ${doc.content}\n`;
      });
      prompt += `\n`;
    }

    if (data.deploymentData) {
      prompt += `Deployment Information:\n`;
      if (data.deploymentData.liveUrl) prompt += `- Live URL: ${data.deploymentData.liveUrl}\n`;
      if (data.deploymentData.githubUrl) prompt += `- GitHub: ${data.deploymentData.githubUrl}\n`;
      if (data.deploymentData.deploymentPlatform) prompt += `- Platform: ${data.deploymentData.deploymentPlatform}\n`;
      prompt += `\n`;
    }

    if (data.publicPageData && data.publicPageData.isPublic) {
      prompt += `Public Page Info:\n`;
      if (data.publicPageData.publicTitle) prompt += `- Public Title: ${data.publicPageData.publicTitle}\n`;
      if (data.publicPageData.publicDescription) prompt += `- Public Description: ${data.publicPageData.publicDescription}\n`;
      if (data.publicPageData.publicTags?.length) prompt += `- Public Tags: ${data.publicPageData.publicTags.join(', ')}\n`;
      prompt += `\n`;
    }

    prompt += `Please help me with: [ADD YOUR REQUEST HERE]`;

    return prompt;
  };

  const generateMarkdownFormat = (data: any): string => {
    let markdown = `# ${selectedProject.name}\n\n`;

    if (data.basicInfo) {
      markdown += `## Basic Information\n\n`;
      markdown += `- **Name:** ${data.basicInfo.name}\n`;
      if (data.basicInfo.category) markdown += `- **Category:** ${data.basicInfo.category}\n`;
      if (data.basicInfo.stagingEnvironment) markdown += `- **Environment:** ${data.basicInfo.stagingEnvironment}\n`;
      markdown += `\n`;
    }

    if (data.description) {
      markdown += `## Description\n\n${data.description}\n\n`;
    }

    if (data.tags?.length) {
      markdown += `## Tags\n\n${data.tags.map((tag: string) => `\`${tag}\``).join(', ')}\n\n`;
    }

    if (data.links?.length) {
      markdown += `## Links\n\n`;
      data.links.forEach((link: any) => {
        markdown += `- [${link.title}](${link.url}) *(${link.type})*\n`;
      });
      markdown += `\n`;
    }

    if (data.notes?.length) {
      markdown += `## Notes\n\n`;
      data.notes.forEach((note: any) => {
        markdown += `### ${note.title}\n${note.content}\n\n`;
      });
    }

    if (data.roadmap?.length) {
      markdown += `## Roadmap\n\n`;
      data.roadmap.forEach((item: any) => {
        const statusEmoji = item.status === 'completed' ? '✅' : item.status === 'in-progress' ? '🚧' : '📝';
        markdown += `- ${statusEmoji} **${item.title}:** ${item.description}\n`;
      });
      markdown += `\n`;
    }

    if (data.docs?.length) {
      markdown += `## Documentation\n\n`;
      data.docs.forEach((doc: any) => {
        markdown += `### ${doc.title}\n${doc.content}\n\n`;
      });
    }

    if (data.deploymentData) {
      markdown += `## Deployment\n\n`;
      if (data.deploymentData.liveUrl) markdown += `- **Live URL:** ${data.deploymentData.liveUrl}\n`;
      if (data.deploymentData.githubUrl) markdown += `- **GitHub:** ${data.deploymentData.githubUrl}\n`;
      if (data.deploymentData.deploymentPlatform) markdown += `- **Platform:** ${data.deploymentData.deploymentPlatform}\n`;
      markdown += `\n`;
    }

    if (data.timestamps) {
      markdown += `## Timestamps\n\n`;
      markdown += `- **Created:** ${new Date(data.timestamps.createdAt).toLocaleDateString()}\n`;
      markdown += `- **Updated:** ${new Date(data.timestamps.updatedAt).toLocaleDateString()}\n`;
    }

    return markdown;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportedData);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = () => {
    const extension = exportFormat === 'markdown' ? 'md' : exportFormat === 'prompt' ? 'txt' : 'json';
    const filename = `${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}-export.${extension}`;
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

  const selectedCount = Object.values(exportOptions).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Export Project Data</h3>
        <p className="text-base-content/70 mb-4">
          Select the data sections you want to export and choose your preferred format.
        </p>
      </div>

      {/* Export Format Selection */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Export Format</span>
        </label>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as any)}
          className="select select-bordered w-full max-w-xs"
        >
          <option value="json">JSON (structured data)</option>
          <option value="prompt">Prompt (for AI assistants)</option>
          <option value="markdown">Markdown (readable format)</option>
        </select>
      </div>

      {/* Data Selection */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="label">
            <span className="label-text font-medium">Select Data to Export ({selectedCount} selected)</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => toggleAll(true)} className="btn btn-ghost btn-sm">
              Select All
            </button>
            <button onClick={() => toggleAll(false)} className="btn btn-ghost btn-sm">
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.basicInfo}
              onChange={() => toggleOption('basicInfo')}
            />
            <span className="label-text">Basic Info</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.description}
              onChange={() => toggleOption('description')}
            />
            <span className="label-text">Description</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.tags}
              onChange={() => toggleOption('tags')}
            />
            <span className="label-text">Tags</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.links}
              onChange={() => toggleOption('links')}
            />
            <span className="label-text">Links</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.notes}
              onChange={() => toggleOption('notes')}
            />
            <span className="label-text">Notes</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.roadmap}
              onChange={() => toggleOption('roadmap')}
            />
            <span className="label-text">Roadmap</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.docs}
              onChange={() => toggleOption('docs')}
            />
            <span className="label-text">Documentation</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.deploymentData}
              onChange={() => toggleOption('deploymentData')}
            />
            <span className="label-text">Deployment</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.publicPageData}
              onChange={() => toggleOption('publicPageData')}
            />
            <span className="label-text">Public Page</span>
          </label>

          <label className="label cursor-pointer justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mr-2"
              checked={exportOptions.timestamps}
              onChange={() => toggleOption('timestamps')}
            />
            <span className="label-text">Timestamps</span>
          </label>
        </div>
      </div>

      {/* Generate Export Button */}
      <div>
        <button
          onClick={generateExport}
          disabled={selectedCount === 0}
          className="btn btn-primary"
        >
          Generate Export
        </button>
      </div>

      {/* Export Result */}
      {showExportResult && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Export Result</h4>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="btn btn-outline btn-sm">
                Copy to Clipboard
              </button>
              <button onClick={downloadFile} className="btn btn-outline btn-sm">
                Download File
              </button>
              <button onClick={() => setShowExportResult(false)} className="btn btn-ghost btn-sm">
                Close
              </button>
            </div>
          </div>
          
          <div className="mockup-code max-h-96 overflow-auto">
            <pre><code>{exportedData}</code></pre>
          </div>
        </div>
      )}

      {/* Export Tips */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h4 className="card-title text-base">💡 Export Tips</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
            <li><strong>JSON:</strong> Best for backup, data migration, or programmatic use</li>
            <li><strong>Prompt:</strong> Optimized for sharing context with AI assistants like Claude or ChatGPT</li>
            <li><strong>Markdown:</strong> Human-readable format perfect for documentation or sharing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExportSection;