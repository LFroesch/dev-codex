import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../../api/projects';
import ConfirmationModal from '../ConfirmationModal';
import type { Project } from '../../api/types';

interface BackupImportExportProps {
  selectedProject: Project;
  onProjectRefresh?: () => void;
}

const BackupImportExport: React.FC<BackupImportExportProps> = ({
  selectedProject,
  onProjectRefresh
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showImportSuccessModal, setShowImportSuccessModal] = useState(false);
  const [importedProjectData, setImportedProjectData] = useState<any>(null);

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
      setImportError('Failed to export project: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsExporting(false);
    }
  };

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
        setImportSuccess(`✅ Project "${result.project.name}" imported successfully!`);
        setImportedProjectData(result.project);
        setShowImportSuccessModal(true);
        
        if (onProjectRefresh) {
          await onProjectRefresh();
        }
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error: any) {
      
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

  return (
    <div className="rounded-lg space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleBackendExport}
          disabled={isExporting}
          className="btn btn-primary btn-sm gap-2"
        >
          {isExporting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Backup
            </>
          )}
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="btn btn-outline btn-sm gap-2"
        >
          {isImporting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Importing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import Project
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

      {/* Status Messages */}
      {importError && (
        <div className="alert alert-error alert-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">{importSuccess}</span>
          <button 
            onClick={() => setImportSuccess('')}
            className="btn btn-ghost btn-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Import Success Modal */}
      <ConfirmationModal
        isOpen={showImportSuccessModal}
        onConfirm={() => {
          setShowImportSuccessModal(false);
          navigate('/projects');
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

export default BackupImportExport;