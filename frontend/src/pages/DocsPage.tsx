import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, Doc, projectAPI } from '../api';

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
    } catch (err) {
      setError('Failed to delete documentation template');
    }
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
    <div className="p-6 space-y-6">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Create New Template */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10 mb-4">
        <input type="checkbox" defaultChecked={!hasAnyDocs} />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Create New Documentation Template
        </div>
        <div className="collapse-content">
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Template Type</span>
                </label>
                <select
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({...newDoc, type: e.target.value as Doc['type']})}
                  className="select select-bordered border-base-300"
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
                  className="input input-bordered border-base-300"
                  placeholder="Enter template title..."
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Template Content</span>
                <button
                  type="button"
                  onClick={() => setNewDoc({...newDoc, content: getTemplateExample(newDoc.type)})}
                  className="btn btn-xs btn-outline"
                >
                  Use Example
                </button>
              </label>
              <textarea
                value={newDoc.content}
                onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
                className="textarea textarea-bordered border-base-300 h-[400px]"
                placeholder="Enter your pseudocode/planning template..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAddDoc}
                disabled={addingDoc || !newDoc.title.trim() || !newDoc.content.trim()}
                className="btn btn-primary"
              >
                {addingDoc ? 'Adding...' : 'Add Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Show message if no docs exist */}
      {!hasAnyDocs && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">No documentation templates yet</h3>
          <p className="text-base-content/60">Create your first template above to get started documenting your project</p>
        </div>
      )}

      {/* Template Categories - Only show categories with docs */}
      {categoriesWithDocs.map(typeInfo => {
        const docs = docsByType[typeInfo.value] || [];
        return (
          <div key={typeInfo.value} className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
            <input type="checkbox" defaultChecked={true} />
            <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
              {typeInfo.label} Templates ({docs.length})
            </div>
            <div className="collapse-content">
              <div className="pt-4">
                <div className="space-y-4">
                  {docs.map(doc => {
                    const isExpanded = expandedDocs.has(doc.id);
                    const isEditing = editingDoc === doc.id;
                    return (
                      <div key={doc.id} className="bg-base-100 shadow-lg border border-base-content/10 rounded-lg mb-4">
                        <div className="p-4">
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
                                <h3 className="font-semibold text-lg">{doc.title}</h3>
                                <div className="text-xs text-base-content/50 mt-1">
                                  Created: {new Date(doc.createdAt).toLocaleDateString()}
                                  {doc.updatedAt !== doc.createdAt && (
                                    <> • Updated: {new Date(doc.updatedAt).toLocaleDateString()}</>
                                  )}
                                </div>
                              </div>
                            </button>
                            
                            <div className="flex gap-2 ml-4">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="btn btn-sm btn-primary"
                                    disabled={!editData.title.trim() || !editData.content.trim()}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="btn btn-sm btn-ghost"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
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
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDoc(doc.id);
                                    }}
                                    className="btn btn-sm btn-error btn-outline"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Collapsible content */}
                          {isExpanded && (
                            <div className="mt-4 border-t border-base-300 pt-4">
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
                                        className="input input-bordered input-sm"
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
                                    <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-base-200 rounded-lg p-4 border border-base-300">
                                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                    {doc.content}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocsPage;