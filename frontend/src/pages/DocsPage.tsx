import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, Doc, projectAPI } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const DocsPage: React.FC = () => {
  const { selectedProject, onProjectRefresh } = useOutletContext<ContextType>();
  
  const [newDoc, setNewDoc] = useState({
    type: 'Model' as Doc['type'],
    title: '',
    content: ''
  });
  const [addingDoc, setAddingDoc] = useState(false);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editData, setEditData] = useState({ type: 'Model' as Doc['type'], title: '', content: '' });
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('create-new');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; docId: string; docTitle: string }>({ 
    isOpen: false, 
    docId: '', 
    docTitle: '' 
  });

  const toggleDocExpanded = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  const docTypes: Array<{ value: Doc['type']; label: string; emoji: string; description: string }> = [
    { value: 'Model', label: 'Model', emoji: '🗃️', description: 'Database models and schemas' },
    { value: 'Route', label: 'Route', emoji: '🛣️', description: 'API routes and endpoints' },
    { value: 'API', label: 'API', emoji: '🔌', description: 'API specifications and contracts' },
    { value: 'Util', label: 'Util', emoji: '🔧', description: 'Utility functions and helpers' },
    { value: 'ENV', label: 'ENV', emoji: '⚙️', description: 'Environment variables and config, do not commit sensitive keys here, this is for documentation and planning purposes ONLY.' },
    { value: 'Auth', label: 'Auth', emoji: '🔐', description: 'Authentication and authorization' },
    { value: 'Runtime', label: 'Runtime', emoji: '⚡', description: 'Runtime configuration and setup' },
    { value: 'Framework', label: 'Framework', emoji: '🏗️', description: 'Framework setup and structure' }
  ];


  const handleAddDoc = async () => {
    if (!selectedProject || !newDoc.title.trim() || !newDoc.content.trim()) return;

    setAddingDoc(true);
    setError('');

    try {
      await projectAPI.createDoc(selectedProject.id, newDoc);
      setNewDoc({ type: 'Model', title: '', content: '' });
      setActiveTemplateCategory('all');
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to add documentation template');
    } finally {
      setAddingDoc(false);
    }
  };

  const handleEditDoc = (doc: Doc) => {
    setEditingDoc(doc.id);
    setEditData({ type: doc.type, title: doc.title, content: doc.content });
    if (!expandedDocs.has(doc.id)) {
      toggleDocExpanded(doc.id); // Expand if not already expanded
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProject || !editingDoc) return;

    try {
      await projectAPI.updateDoc(selectedProject.id, editingDoc, editData);
      setEditingDoc(null);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to update documentation template');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!selectedProject) return;

    try {
      await projectAPI.deleteDoc(selectedProject.id, docId);
      await onProjectRefresh();
      setDeleteConfirmation({ isOpen: false, docId: '', docTitle: '' });
    } catch (err) {
      setError('Failed to delete documentation template');
    }
  };

  const confirmDeleteDoc = (docId: string, docTitle: string) => {
    setDeleteConfirmation({ isOpen: true, docId, docTitle });
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setEditData({ type: 'Model', title: '', content: '' });
  };

  const getTemplateExample = (type: Doc['type']): string => {
    const examples = {
      Model: `User Model:
- id: ObjectId (primary key)
- email: String (unique, required)
- password: String (hashed, required)
- firstName: String (required)
- lastName: String (required)
- createdAt: Date (auto)
- updatedAt: Date (auto)`,
      Route: `Auth Routes:
POST /api/auth/login
- Body: { email, password }
- Response: { user, token }

POST /api/auth/register  
- Body: { email, password, firstName, lastName }
- Response: { user, token }

GET /api/auth/me
- Headers: Authorization Bearer token
- Response: { user }`,
      API: `User API Specification:

GET /api/users
- Query: ?page=1&limit=10&search=john
- Response: { users: [], total, page, limit }

POST /api/users
- Body: { email, firstName, lastName }
- Response: { user, message }

PUT /api/users/:id
- Body: { firstName?, lastName? }
- Response: { user, message }`,
      Util: `Utility Functions:

// Password hashing
hashPassword(password: string): Promise<string>
comparePassword(password: string, hash: string): Promise<boolean>

// JWT tokens
generateToken(payload: object): string
verifyToken(token: string): object | null

// Validation
validateEmail(email: string): boolean
sanitizeInput(input: string): string`,
      ENV: `Environment Variables:
      Reminder: do not commit sensitive keys here, this is for documentatation purposes ONLY.
      Do not commit environment variables to version control.

# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/myapp
DB_NAME=myapp

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# External Services
SENDGRID_API_KEY=your-sendgrid-key
AWS_S3_BUCKET=your-bucket-name`,
      Auth: `Authentication Strategy:

Middleware:
- requireAuth: Verify JWT token
- requireAdmin: Check admin role
- rateLimiter: Prevent brute force

JWT Implementation:
- Access token: 15 minutes
- Refresh token: 7 days
- Store refresh tokens in DB
- Blacklist on logout

Password Policy:
- Minimum 8 characters
- Require uppercase, lowercase, number
- Hash with bcrypt (12 rounds)`,
      Runtime: `Runtime Configuration:

Node.js Setup:
- Version: 18+ LTS
- Package manager: npm/yarn
- Process manager: PM2

Development:
- Hot reload: nodemon
- Debugging: VS Code debugger
- Linting: ESLint + Prettier

Production:
- Reverse proxy: Nginx
- SSL: Let's Encrypt
- Monitoring: Winston logging
- Health checks: /health endpoint`,
      Framework: `Framework Structure:

Express.js App:
/src
  /controllers  - Route handlers
  /middleware   - Custom middleware
  /models       - Database models
  /routes       - API routes
  /utils        - Helper functions
  /config       - Configuration files
  /types        - TypeScript types

React App:
/src
  /components   - Reusable UI components
  /pages        - Page components
  /hooks        - Custom hooks
  /utils        - Helper functions
  /types        - TypeScript interfaces`
    };
    return examples[type] || '';
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view documentation templates</p>
        </div>
      </div>
    );
  }

  // Group docs by type
  const docsByType = selectedProject.docs.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<Doc['type'], Doc[]>);

  // Get only the categories that have docs
  const categoriesWithDocs = docTypes.filter(typeInfo => {
    const docs = docsByType[typeInfo.value] || [];
    return docs.length > 0;
  });

  // Check if there are any docs at all
  const hasAnyDocs = selectedProject.docs.length > 0;

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Template Categories Navigation */}
      <div className="flex justify-center px-2">
        <div className="tabs-container overflow-x-auto">
          <button 
            className={`tab-button ${activeTemplateCategory === 'create-new' ? 'tab-active' : ''}`}
            style={activeTemplateCategory === 'create-new' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTemplateCategory('create-new')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New
          </button>
          {categoriesWithDocs.length > 0 && (
            <button 
              className={`tab-button ${activeTemplateCategory === 'all' ? 'tab-active' : ''}`}
              style={activeTemplateCategory === 'all' ? {color: getContrastTextColor()} : {}}
              onClick={() => setActiveTemplateCategory('all')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              All Templates ({selectedProject.docs?.length || 0})
            </button>
          )}
          {categoriesWithDocs.map(typeInfo => (
            <button 
              key={typeInfo.value}
              className={`tab-button ${activeTemplateCategory === typeInfo.value ? 'tab-active' : ''}`}
              style={activeTemplateCategory === typeInfo.value ? {color: getContrastTextColor()} : {}}
              onClick={() => setActiveTemplateCategory(typeInfo.value)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {typeInfo.value === 'Model' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4m16 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                )}
                {typeInfo.value === 'Route' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                )}
                {typeInfo.value === 'API' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                )}
                {typeInfo.value === 'Util' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                )}
                {typeInfo.value === 'ENV' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                )}
                {typeInfo.value === 'Auth' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
                {typeInfo.value === 'Runtime' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                )}
                {typeInfo.value === 'Framework' && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                )}
                {!['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'].includes(typeInfo.value) && (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                )}
              </svg>
              {typeInfo.label} ({docsByType[typeInfo.value]?.length || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTemplateCategory === 'create-new' ? (
        // Create New Template Content
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📝</div>
              <span>Create New Documentation Template</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Template Type</span>
                  </label>
                  <select
                    value={newDoc.type}
                    onChange={(e) => setNewDoc({...newDoc, type: e.target.value as Doc['type']})}
                    className="select select-bordered"
                  >
                    {docTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Template Title</span>
                  </label>
                  <input
                    type="text"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                    className="input input-bordered text-sm"
                    placeholder="Enter template title..."
                  />
                </div>
              </div>

                <div className="form-control flex justify-end mb-2">
                <div className="label">
                  <span className="label-text font-medium">Template Content</span>
                  <button
                  type="button"
                  onClick={() => setNewDoc({...newDoc, content: getTemplateExample(newDoc.type)})}
                  className="btn btn-xs btn-outline"
                  >
                  Use Example
                  </button>
                </div>
                  

                <textarea
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                  className="textarea textarea-bordered h-[300px]"
                  placeholder="Enter your pseudocode/planning template..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddDoc}
                  disabled={addingDoc || !newDoc.title.trim() || !newDoc.content.trim()}
                  className="btn btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  {addingDoc ? 'Adding...' : 'Add Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Existing Templates Content
        <>
          {/* Show message if no docs exist */}
          {!hasAnyDocs && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-lg font-medium mb-2 text-base-content/80">No documentation templates yet</h3>
              <p className="text-sm text-base-content/60">Create your first template using the "Create New" tab above</p>
            </div>
          )}

          {/* Template Categories Content */}
          {categoriesWithDocs.length > 0 && (
            <div className="section-container mb-4">
              <div className="section-header">
                <div className="flex items-center gap-3">
                  <div className="section-icon">
                    {activeTemplateCategory === 'all' ? '📚' : categoriesWithDocs.find(c => c.value === activeTemplateCategory)?.emoji}
                  </div>
                  <span>
                    {activeTemplateCategory === 'all' 
                      ? 'All Documentation Templates' 
                      : `${categoriesWithDocs.find(c => c.value === activeTemplateCategory)?.label} Templates`
                    }
                  </span>
                </div>
              </div>
              <div className="section-content">
                <div className="space-y-3">
                      {(activeTemplateCategory === 'all' 
                        ? selectedProject.docs || []
                        : docsByType[activeTemplateCategory as Doc['type']] || []
                      ).map((doc: any) => {
                        const isExpanded = expandedDocs.has(doc.id);
                        const isEditing = editingDoc === doc.id;
                        const docType = docTypes.find(t => t.value === doc.type);
                        return (
                          <div key={doc.id} className="card-interactive group p-3">
                              {/* Header with title and controls */}
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => toggleDocExpanded(doc.id)}
                                  className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
                                  disabled={isEditing}
                                >
                                  <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                    <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h3 className="font-semibold text-base">{doc.title}</h3>
                                      {activeTemplateCategory === 'all' && docType && (
                                        <span className="px-2 py-1 rounded-md bg-base-300 text-xs font-medium">
                                          {docType.emoji} {docType.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-base-content/50">
                                      <div>Created: {new Date(doc.createdAt).toLocaleDateString()}</div>
                                      {doc.updatedAt !== doc.createdAt && (
                                        <div>Updated: {new Date(doc.updatedAt).toLocaleDateString()}</div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                                
                                <div className="flex gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={handleSaveEdit}
                                        className="btn btn-sm btn-primary"
                                        style={{ color: getContrastTextColor('primary') }}
                                        disabled={!editData.title.trim() || !editData.content.trim()}
                                        title="Save changes"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="hidden sm:inline">Save</span>
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="btn btn-sm btn-ghost"
                                        title="Cancel editing"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="hidden sm:inline">Cancel</span>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditDoc(doc);
                                        }}
                                        className="btn btn-sm btn-ghost"
                                        title="Edit template"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="hidden sm:inline">Edit</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmDeleteDoc(doc.id, doc.title);
                                        }}
                                        className="btn btn-sm btn-error btn-outline"
                                        title="Delete template"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="hidden sm:inline">Delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Collapsible content */}
                              {isExpanded && (
                                <div className="mt-4 border-t border-base-content/20 pt-4">
                                  {isEditing ? (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="form-control">
                                          <label className="label">
                                            <span className="label-text font-medium">Type</span>
                                          </label>
                                          <select
                                            value={editData.type}
                                            onChange={(e) => setEditData({...editData, type: e.target.value as Doc['type']})}
                                            className="select select-bordered select-sm"
                                          >
                                            {docTypes.map(type => (
                                              <option key={type.value} value={type.value}>
                                                {type.emoji} {type.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="form-control md:col-span-2">
                                          <label className="label">
                                            <span className="label-text font-medium">Title</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={editData.title}
                                            onChange={(e) => setEditData({...editData, title: e.target.value})}
                                            className="input input-bordered input-sm text-base-content/40"
                                          />
                                        </div>
                                      </div>
                                      <div className="form-control">
                                        <label className="label">
                                          <span className="label-text font-medium">Content</span>
                                        </label>
                                        <textarea
                                          value={editData.content}
                                          onChange={(e) => setEditData({...editData, content: e.target.value})}
                                          className="textarea textarea-bordered h-[500px]"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm">
                                          Cancel
                                        </button>
                                        <button onClick={handleSaveEdit} className="btn btn-primary btn-sm" style={{ color: getContrastTextColor('primary') }}>
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-base-200/40 rounded-lg p-4 border-2 border-base-content/20">
                                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                        {doc.content}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                      })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={() => handleDeleteDoc(deleteConfirmation.docId)}
        onCancel={() => setDeleteConfirmation({ isOpen: false, docId: '', docTitle: '' })}
        title="Delete Documentation Template"
        message={`Are you sure you want to delete "${deleteConfirmation.docTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />
    </div>
  );
};

export default DocsPage;