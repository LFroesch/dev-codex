import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BaseProject } from '../../../shared/types';
import { projectAPI } from '../api/projects';
import ConfirmationModal from './ConfirmationModal';

interface ExportSectionProps {
  selectedProject: BaseProject;
  onProjectRefresh?: () => void;
}

interface ExportOptions {
  basicInfo: boolean;
  description: boolean;
  tags: boolean;
  links: boolean;
  notes: boolean;
  todos: boolean;
  devLog: boolean;
  docs: boolean;
  techStack: boolean;
  deploymentData: boolean;
  publicPageData: boolean;
  timestamps: boolean;
}

const ExportSection: React.FC<ExportSectionProps> = ({ selectedProject, onProjectRefresh }) => {
  const navigate = useNavigate();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    description: true,
    tags: true,
    links: true,
    notes: false,
    todos: false,
    devLog: false,
    docs: false,
    techStack: false,
    deploymentData: false,
    publicPageData: false,
    timestamps: false,
  });

  const [exportFormat, setExportFormat] = useState<'json' | 'prompt' | 'markdown'>('json');
  const [exportedData, setExportedData] = useState<string>('');
  const [showExportResult, setShowExportResult] = useState(false);
  const [customAiRequest, setCustomAiRequest] = useState<string>('');
  
  // Import/Export states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<string>('');
  const [showImportSuccessModal, setShowImportSuccessModal] = useState(false);
  const [importedProjectData, setImportedProjectData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (exportOptions.tags && selectedProject.tags) {
      data.tags = selectedProject.tags;
    }

    // Note: links property might not exist in BaseProject interface
    // if (exportOptions.links && selectedProject.links?.length) {
    //   data.links = selectedProject.links;
    // }

    if (exportOptions.notes && selectedProject.notes?.length) {
      data.notes = selectedProject.notes;
    }

    if (exportOptions.todos && selectedProject.todos?.length) {
      data.todos = selectedProject.todos;
    }

    if (exportOptions.devLog && selectedProject.devLog?.length) {
      data.devLog = selectedProject.devLog;
    }

    if (exportOptions.docs && selectedProject.docs?.length) {
      data.docs = selectedProject.docs;
    }

    if (exportOptions.techStack && (selectedProject.selectedTechnologies?.length || selectedProject.selectedPackages?.length)) {
      data.techStack = {
        technologies: selectedProject.selectedTechnologies || [],
        packages: selectedProject.selectedPackages || []
      };
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
        try {
          output = JSON.stringify(data, (_, value) => {
            // Handle potential circular references and limit string length
            if (typeof value === 'string' && value.length > 10000) {
              return value.substring(0, 10000) + '... [truncated]';
            }
            return value;
          }, 2);
        } catch (error) {
          output = `Error generating JSON: ${error}`;
        }
        break;
      
      case 'prompt':
        try {
          output = generatePromptFormat(data);
        } catch (error) {
          output = `Error generating prompt: ${error}`;
        }
        break;
      
      case 'markdown':
        try {
          output = generateMarkdownFormat(data);
        } catch (error) {
          output = `Error generating markdown: ${error}`;
        }
        break;
    }

    setExportedData(output);
    setShowExportResult(true);
  };

  const generatePromptFormat = (data: any): string => {
    const requestSection = customAiRequest.trim() 
      ? customAiRequest 
      : `[Please replace this text with what you need help with regarding this project. For example:
- Code review or optimization suggestions
- Architecture advice
- Debugging assistance
- Feature implementation guidance
- Testing strategies
- Performance improvements
- Security considerations
- Deployment help
- Documentation improvements]`;

    let prompt = `
# Project Context for AI Assistant for "${selectedProject.name}"

${selectedProject.description ? `**Description:** ${selectedProject.description}` : ''}

## 🤖 MY REQUEST:
${requestSection}

## 📋 PROJECT OVERVIEW`;

    if (data.basicInfo) {
      prompt += `
**Project Name:** ${data.basicInfo.name}`;
      if (data.basicInfo.category) prompt += `
**Category:** ${data.basicInfo.category}`;
      if (data.basicInfo.stagingEnvironment) prompt += `
**Current Environment:** ${data.basicInfo.stagingEnvironment}`;
      if (data.basicInfo.color) prompt += `
**Theme Color:** ${data.basicInfo.color}`;
    }

    if (data.tags) {
      prompt += `

**Tags/Keywords:** ${data.tags.length ? data.tags.join(' • ') : 'None'}`;
    }

    if (data.links?.length) {
      prompt += `

## 🔗 PROJECT RESOURCES`;
      data.links.forEach((link: any) => {
        const emoji = link.type === 'github' ? '💻' : 
                     link.type === 'demo' ? '🌐' : 
                     link.type === 'docs' ? '📚' : '🔗';
        prompt += `
${emoji} **${link.title}:** ${link.url} (${link.type})`;
      });
    }

    if (data.techStack) {
      prompt += `

## ⚡ TECH STACK`;
      if (data.techStack.technologies?.length) {
        prompt += `
**Technologies:** ${data.techStack.technologies.map((tech: any) => tech.name).join(' • ')}`;
      }
      if (data.techStack.packages?.length) {
        prompt += `
**Packages/Dependencies:** ${data.techStack.packages.map((pkg: any) => pkg.name).join(' • ')}`;
      }
    }

    if (data.todos?.length) {
      const completedTodos = data.todos.filter((todo: any) => todo?.completed);
      const pendingTodos = data.todos.filter((todo: any) => todo && !todo.completed);
      
      prompt += `

## ✅ CURRENT TASKS (${completedTodos.length} completed, ${pendingTodos.length} pending)`;
      
      if (pendingTodos.length > 0) {
        prompt += `

**🚧 Pending Tasks:**`;
        pendingTodos.forEach((todo: any) => {
          if (todo?.text) {
            prompt += `
• ${todo.text}${todo.description ? ` - ${todo.description}` : ''}`;
            if (todo.priority) prompt += ` [${todo.priority.toUpperCase()} PRIORITY]`;
          }
        });
      }

      if (completedTodos.length > 0) {
        prompt += `

**✅ Completed Tasks:**`;
        completedTodos.forEach((todo: any) => {
          if (todo?.text) {
            prompt += `
• ${todo.text}${todo.description ? ` - ${todo.description}` : ''}`;
          }
        });
      }
    }

    if (data.devLog?.length) {
      const recentEntries = data.devLog.slice(-5); // Show last 5 entries
      prompt += `

## 📝 RECENT DEVELOPMENT LOG`;
      recentEntries.forEach((entry: any) => {
        const entryContent = entry.entry?.length > 500 ? 
          entry.entry.substring(0, 500) + '...' : 
          entry.entry || '';
        prompt += `

**${entry.date}${entry.title ? ' - ' + entry.title : ''}**
${entryContent}`;
      });
      if (data.devLog.length > 5) {
        prompt += `

*(Showing ${recentEntries.length} most recent entries out of ${data.devLog.length} total)*`;
      }
    }

    if (data.notes?.length) {
      prompt += `

## 📋 PROJECT NOTES`;
      data.notes.forEach((note: any) => {
        const noteContent = note.content?.length > 1000 ? 
          note.content.substring(0, 1000) + '...' : 
          note.content || '';
        prompt += `

**${note.title || 'Untitled Note'}**
${noteContent}`;
      });
    }

    if (data.docs?.length) {
      prompt += `

## 📚 DOCUMENTATION`;
      const docsByType = data.docs.reduce((acc: any, doc: any) => {
        if (!acc[doc.type]) acc[doc.type] = [];
        acc[doc.type].push(doc);
        return acc;
      }, {});

      Object.entries(docsByType).forEach(([type, docs]: [string, any]) => {
        prompt += `

**${type} Documentation:**`;
        docs.forEach((doc: any) => {
          const docContent = doc.content?.length > 800 ? 
            doc.content.substring(0, 800) + '...' : 
            doc.content || '';
          prompt += `
• **${doc.title || 'Untitled'}:** ${docContent}`;
        });
      });
    }

    if (data.deploymentData) {
      prompt += `

## 🚀 DEPLOYMENT INFO`;
      if (data.deploymentData.liveUrl) prompt += `
**Live URL:** ${data.deploymentData.liveUrl}`;
      if (data.deploymentData.githubUrl) prompt += `
**GitHub Repository:** ${data.deploymentData.githubUrl}`;
      if (data.deploymentData.deploymentPlatform) prompt += `
**Hosting Platform:** ${data.deploymentData.deploymentPlatform}`;
      if (data.deploymentData.environment) prompt += `
**Environment:** ${data.deploymentData.environment}`;
    }

    if (data.publicPageData?.isPublic) {
      prompt += `

## 🌐 PUBLIC PAGE INFO`;
      if (data.publicPageData.publicTitle) prompt += `
**Public Title:** ${data.publicPageData.publicTitle}`;
      if (data.publicPageData.publicDescription) prompt += `
**Public Description:** ${data.publicPageData.publicDescription}`;
      if (data.publicPageData.publicTags?.length) prompt += `
**Public Tags:** ${data.publicPageData.publicTags.join(' • ')}`;
    }

    if (data.timestamps) {
      const created = new Date(data.timestamps.createdAt);
      const updated = new Date(data.timestamps.updatedAt);
      const daysSinceCreated = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdated = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
      
      prompt += `

## ⏱️ PROJECT TIMELINE
**Created:** ${created.toLocaleDateString()} (${daysSinceCreated} days ago)
**Last Updated:** ${updated.toLocaleDateString()} (${daysSinceUpdated} days ago)`;
    }

    prompt += `

---`;

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

    if (data.tags) {
      markdown += `## Tags\n\n${data.tags.length ? data.tags.map((tag: string) => `\`${tag}\``).join(', ') : 'None'}\n\n`;
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
        const noteContent = note.content?.length > 2000 ? 
          note.content.substring(0, 2000) + '...' : 
          note.content || '';
        markdown += `### ${note.title || 'Untitled Note'}\n${noteContent}\n\n`;
      });
    }

    if (data.todos?.length) {
      markdown += `## Todo Items\n\n`;
      data.todos.forEach((todo: any) => {
        const todoDesc = todo.description?.length > 200 ? 
          todo.description.substring(0, 200) + '...' : 
          todo.description;
        markdown += `- [${todo.completed ? 'x' : ' '}] **${todo.text || 'Untitled Task'}**${todoDesc ? `: ${todoDesc}` : ''}\n`;
      });
      markdown += `\n`;
    }

    if (data.devLog?.length) {
      markdown += `## Development Log\n\n`;
      data.devLog.forEach((entry: any) => {
        const entryContent = entry.entry?.length > 1500 ? 
          entry.entry.substring(0, 1500) + '...' : 
          entry.entry || '';
        markdown += `### ${entry.date} - ${entry.title || 'Development Entry'}\n${entryContent}\n\n`;
      });
    }

    if (data.docs?.length) {
      markdown += `## Documentation\n\n`;
      data.docs.forEach((doc: any) => {
        const docContent = doc.content?.length > 2000 ? 
          doc.content.substring(0, 2000) + '...' : 
          doc.content || '';
        markdown += `### ${doc.title || 'Untitled'} (${doc.type})\n${docContent}\n\n`;
      });
    }

    if (data.techStack) {
      markdown += `## Tech Stack\n\n`;
      if (data.techStack.technologies?.length) {
        markdown += `### Technologies\n${data.techStack.technologies.map((tech: any) => `- ${tech.name}`).join('\n')}\n\n`;
      }
      if (data.techStack.packages?.length) {
        markdown += `### Packages\n${data.techStack.packages.map((pkg: any) => `- ${pkg.name}`).join('\n')}\n\n`;
      }
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

  // Backend Export Handler
  const handleBackendExport = async () => {
    try {
      setIsExporting(true);
      const projectId = selectedProject.id || (selectedProject as any)._id;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      const blob = await projectAPI.exportProject(projectId);
      
      // Create download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      setImportError('Failed to export project: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsExporting(false);
    }
  };

  // Import Handler
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportError('');
      setImportSuccess('');

      // Read file
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate basic structure
      if (!importData.project) {
        throw new Error('Invalid import file: missing project data');
      }

      // Import via API
      const result = await projectAPI.importProject(importData);
      
      if (result.success) {
        setImportSuccess(`✅ NEW PROJECT CREATED: "${result.project.name}" has been imported as a separate project for safety. Check your project list!`);
        setImportedProjectData(result.project);
        setShowImportSuccessModal(true);
        
        if (onProjectRefresh) {
          await onProjectRefresh();
        }
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      console.error('Import error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error during import - this might cause logout');
      }
      
      if (error instanceof SyntaxError) {
        setImportError('Invalid JSON file format');
      } else if (error.response?.data?.message) {
        setImportError(`Import failed: ${error.response.data.message}`);
      } else if (error.response?.data?.errors) {
        setImportError(`Validation errors: ${error.response.data.errors.join(', ')}`);
      } else {
        setImportError(`Import failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const selectedCount = Object.values(exportOptions).filter(Boolean).length;

  return (
    <div className="pt-4 space-y-4">
      {/* Header with description */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-base-content/70">
            Export project data for backup, sharing, or AI assistance. Import project data from backups.
          </p>
        </div>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as any)}
          className="select select-bordered select-sm"
        >
          <option value="json">JSON</option>
          <option value="prompt">AI Prompt</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      {/* Import/Export Quick Actions */}
      <div className="bg-base-200/30 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          📦 Project Backup & Import
          <span className="badge badge-xs badge-primary">Creates New Project</span>
        </h4>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleBackendExport}
            disabled={isExporting}
            className="btn btn-primary btn-sm"
          >
            {isExporting ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Exporting...
              </>
            ) : (
              <>
                📥 Export Project Backup
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isImporting}
            className="btn btn-outline btn-sm"
          >
            {isImporting ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Importing...
              </>
            ) : (
              <>
                📤 Import Project
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>

        {/* Import/Export Status Messages */}
        {importError && (
          <div className="alert alert-error alert-sm">
            <span className="text-xs">{importError}</span>
            <button 
              onClick={() => setImportError('')}
              className="btn btn-ghost btn-xs"
            >
              ✕
            </button>
          </div>
        )}
        
        {importSuccess && (
          <div className="alert alert-success alert-sm">
            <span className="text-xs">{importSuccess}</span>
            <button 
              onClick={() => setImportSuccess('')}
              className="btn btn-ghost btn-xs"
            >
              ✕
            </button>
          </div>
        )}

        <p className="text-xs text-base-content/50">
          💡 <strong>Export:</strong> Downloads a complete backup with all project data (sanitized for security).
          <br />
          🚀 <strong>Import:</strong> Creates a NEW project from backup file (keeps your original project safe).
        </p>
      </div>

      <div className="divider text-xs">Custom Export Options</div>

      {/* Custom AI Request Input - Only show when AI Prompt format is selected */}
      {exportFormat === 'prompt' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Custom AI Request</label>
          <textarea
            value={customAiRequest}
            onChange={(e) => setCustomAiRequest(e.target.value)}
            placeholder="Type your custom request here (optional). If left empty, a default template will be used."
            className="textarea textarea-bordered w-full text-sm"
            rows={3}
          />
        </div>
      )}

      {/* Data Selection - Compact Grid */}
      <div>
        <div className="flex-between-center mb-2">
          <span className="text-sm font-medium">Select Data ({selectedCount})</span>
          
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(exportOptions).map(([key, checked]) => (
            <label key={key} className="label cursor-pointer justify-start py-1">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm mr-2"
                checked={checked}
                onChange={() => toggleOption(key as keyof ExportOptions)}
              />
              <span className="label-text text-sm capitalize">
                {key === 'basicInfo' ? 'Basic Info' :
                 key === 'publicPageData' ? 'Public Page' :
                 key === 'deploymentData' ? 'Deployment' :
                 key === 'devLog' ? 'Dev Log' :
                 key === 'techStack' ? 'Tech Stack' :
                 key}
              </span>
            </label>
          ))}
        </div>
      </div>

        <div className="ml-5 flex gap-1">
            <button onClick={() => toggleAll(true)} className="btn-ghost-xs">
              All
            </button>
            <button onClick={() => toggleAll(false)} className="btn-ghost-xs">
              None
            </button>
          </div>
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateExport}
          disabled={selectedCount === 0}
          className="btn-primary-sm"
        >
          {showExportResult ? 'Regenerate' : 'Generate Export'}
        </button>
        
        {showExportResult && (
          <>
            <button onClick={copyToClipboard} className="btn-outline-sm">
              📋 Copy
            </button>
            <button onClick={downloadFile} className="btn-outline-sm">
              💾 Download
            </button>
            <button onClick={() => setShowExportResult(false)} className="btn-ghost-sm">
              ✕
            </button>
          </>
        )}
      </div>

      {/* Export Result - Compact */}
      {showExportResult && (
        <div className="space-y-2">
          <div className="text-xs text-base-content/60 flex-between-center">
            <span>Export Result ({exportFormat.toUpperCase()})</span>
            <span>{exportedData.length} characters</span>
          </div>
          
          <div className="mockup-code max-h-96 overflow-auto text-xs">
            <pre className="whitespace-pre-wrap break-words"><code>{exportedData}</code></pre>
          </div>
        </div>
      )}

      {/* Import Success Modal */}
      <ConfirmationModal
        isOpen={showImportSuccessModal}
        onConfirm={() => {
          setShowImportSuccessModal(false);
          // Navigate to projects view where user can see the new project
          navigate('/notes?view=projects');
        }}
        onCancel={() => {
          setShowImportSuccessModal(false);
          setImportedProjectData(null);
        }}
        title="🎉 Import Successful!"
        message={importedProjectData ? 
          `<p>A new project <strong>"${importedProjectData.name}"</strong> has been created successfully!</p>
           <br/>
           <p>This approach keeps your original project safe while giving you a clean copy to work with.</p>
           <br/>
           <p>Make sure to clean up your old project if you decide to delete it.</p>
           <br/>
           <p>Would you like to open the new project now?</p>` : 
          'Project imported successfully!'
        }
        confirmText="Open New Project"
        cancelText="Stay Here"
        variant="info"
      />
    </div>
  );
};

export default ExportSection;