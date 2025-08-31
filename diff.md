diff --git a/frontend/src/pages/AccountSettingsPage_backup.tsx b/frontend/src/pages/AccountSettingsPage_backup.tsx
new file mode 100644
index 0000000..e69de29
diff --git a/frontend/src/pages/PublicPage.tsx b/frontend/src/pages/PublicPage.tsx
index c5b8f5d..bd66335 100644
--- a/frontend/src/pages/PublicPage.tsx
+++ b/frontend/src/pages/PublicPage.tsx
@@ -281,7 +281,7 @@ const PublicPage: React.FC = () => {
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-              <h2 className="text-xl font-bold mb-0">🌐 Public Settings</h2>
+              <h2 className="text-xl font-bold mb-0">🌐 Sharing + Settings</h2>
             </div>
             <button
               onClick={handleSave}
diff --git a/frontend/src/pages/SettingsPage.tsx b/frontend/src/pages/SettingsPage.tsx
index e5dce5a..ae0e3b4 100644
--- a/frontend/src/pages/SettingsPage.tsx
+++ b/frontend/src/pages/SettingsPage.tsx
@@ -35,7 +35,6 @@ const SettingsPage: React.FC = () => {
   const [archiveLoading, setArchiveLoading] = useState(false);
   const [deleteConfirm, setDeleteConfirm] = useState(false);
   const [error, setError] = useState('');
-  const [activeSection, setActiveSection] = useState<'overview' | 'info' | 'export' | 'danger'>('overview');
 
   useEffect(() => {
     if (selectedProject) {
@@ -169,38 +168,9 @@ const SettingsPage: React.FC = () => {
   ];
 
   return (
-    <div className="p-6">
-      {/* Navigation Tabs */}
-      <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 mb-6">
-        <button 
-          className={`tab ${activeSection === 'overview' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('overview')}
-        >
-          Overview
-        </button>
-        <button 
-          className={`tab ${activeSection === 'info' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('info')}
-        >
-          Project Info
-        </button>
-        <button 
-          className={`tab ${activeSection === 'export' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('export')}
-        >
-          Export & Import
-        </button>
-        <button 
-          className={`tab ${activeSection === 'danger' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('danger')}
-        >
-          Danger Zone
-        </button>
-      </div>
-
-      {/* Error Messages */}
+    <div className="space-y-4">
       {error && (
-        <div className="alert alert-error shadow-md mb-6">
+        <div className="alert alert-error shadow-md">
           <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
@@ -209,96 +179,12 @@ const SettingsPage: React.FC = () => {
         </div>
       )}
 
-      {/* Overview Section */}
-      {activeSection === 'overview' && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">⚙️ Project Overview</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <div className="flex items-center gap-4 mb-4">
-              <div 
-                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
-                style={{ backgroundColor: selectedProject.color }}
-              >
-                {selectedProject.name.charAt(0).toUpperCase()}
-              </div>
-              <div className="flex-1">
-                <h3 className="text-2xl font-semibold">{selectedProject.name}</h3>
-                <p className="text-base-content/70 mb-2">{selectedProject.description}</p>
-                <div className="flex items-center gap-3">
-                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
-                    selectedProject.isArchived 
-                      ? 'bg-gray-200 text-gray-800' 
-                      : 'bg-success/20 text-success'
-                  }`}>
-                    {selectedProject.isArchived ? '📦 Archived' : '✨ Active'}
-                  </span>
-                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
-                    selectedProject.isShared
-                      ? 'bg-info/20 text-info'
-                      : 'bg-warning/20 text-warning'
-                  }`}>
-                    {selectedProject.isShared ? '👥 Shared' : '🔒 Private'}
-                  </span>
-                </div>
-              </div>
-            </div>
-            
-            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
-              <div className="space-y-2 text-sm">
-                <div>
-                  <span className="font-medium">Created:</span> {new Date(selectedProject.createdAt).toLocaleDateString()}
-                </div>
-                <div>
-                  <span className="font-medium">Updated:</span> {new Date(selectedProject.updatedAt).toLocaleDateString()}
-                </div>
-                <div>
-                  <span className="font-medium">Category:</span> {selectedProject.category}
-                </div>
-              </div>
-              <div className="space-y-2 text-sm">
-                <div>
-                  <span className="font-medium">Environment:</span>
-                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
-                    selectedProject.stagingEnvironment === 'production' ? 'bg-error/20 text-error' :
-                    selectedProject.stagingEnvironment === 'staging' ? 'bg-warning/20 text-warning' :
-                    'bg-success/20 text-success'
-                  }`}>
-                    {selectedProject.stagingEnvironment?.charAt(0).toUpperCase() + selectedProject.stagingEnvironment?.slice(1)}
-                  </span>
-                </div>
-                <div>
-                  <span className="font-medium">Tags:</span> 
-                  <div className="flex flex-wrap gap-1 mt-1">
-                    {selectedProject.tags && selectedProject.tags.length > 0 ? (
-                      selectedProject.tags.map((tag, index) => (
-                        <span key={index} className="badge badge-info badge-sm">{tag}</span>
-                      ))
-                    ) : (
-                      <span className="text-base-content/60 italic">No tags</span>
-                    )}
-                  </div>
-                </div>
-                <div>
-                  <span className="font-medium">Project ID:</span> 
-                  <span className="font-mono text-xs ml-2">{selectedProject.id}</span>
-                </div>
-              </div>
-            </div>
-          </div>
-        </div>
-      )}
-
-      {/* Project Info Section */}
-      {activeSection === 'info' && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">⚙️ Project Information</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+      {/* Project Information */}
+      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
+          <span className="text-xl">⚙️</span>
+          Project Information
+        </h2>
           {/* Basic Info Section */}
           <div className="pt-4">
             <div className="flex justify-between items-center mb-3">
@@ -620,67 +506,59 @@ const SettingsPage: React.FC = () => {
               </div>
             </div>
           </div>
-          </div>
-        </div>
-      )}
+      </div>
+
 
-      {/* Export & Import Section */}
-      {activeSection === 'export' && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">📤 Export & Import</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
-          </div>
-        </div>
-      )}
 
-      {/* Danger Zone Section */}
-      {activeSection === 'danger' && (
+      {/* Export Data */}
+      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
+          <span className="text-xl">📤</span>
+          Export & Import Project Data
+        </h2>
+        <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
+      </div>
+
+      {/* Danger Zone */}
+      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-error">
+          <span className="text-xl">⚠️</span>
+          Danger Zone
+        </h2>
         <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0 text-error">⚠️ Danger Zone</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <div className="space-y-4">
-              <div className={`p-4 ${!selectedProject.isArchived ? 'bg-warning/10 border-warning/20' : 'bg-info/10 border-info/20'} rounded-lg border`}>
-                <h4 className={`font-semibold ${!selectedProject.isArchived ? 'text-warning' : 'text-info'} mb-2`}>{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
-                <p className={`${!selectedProject.isArchived ? 'text-warning/80' : 'text-info/80'} text-sm mb-4`}>
-                  {selectedProject.isArchived ? 'Make this project active again' : 'Move this project to archived section'}
-                </p>
-                <button
-                  onClick={handleArchiveToggle}
-                  className={`btn ${
-                    selectedProject.isArchived 
-                      ? 'btn-info' 
-                      : 'btn-warning'
-                  }`}
-                  disabled={archiveLoading}
-                >
-                  {archiveLoading ? 'Processing...' : selectedProject.isArchived ? 'Make Active' : 'Archive Project'}
-                </button>
-              </div>
+            <div className={`p-4 ${!selectedProject.isArchived ? 'bg-warning/10 border-warning/20' : 'bg-info/10 border-info/20'} rounded-lg border`}>
+              <h4 className={`font-semibold ${!selectedProject.isArchived ? 'text-warning' : 'text-info'} mb-2`}>{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
+              <p className={`${!selectedProject.isArchived ? 'text-warning/80' : 'text-info/80'} text-sm mb-4`}>
+                {selectedProject.isArchived ? 'Make this project active again' : 'Move this project to archived section'}
+              </p>
+              <button
+                onClick={handleArchiveToggle}
+                className={`btn ${
+                  selectedProject.isArchived 
+                    ? 'btn-info' 
+                    : 'btn-warning'
+                }`}
+                disabled={archiveLoading}
+              >
+                {archiveLoading ? 'Processing...' : selectedProject.isArchived ? 'Make Active' : 'Archive Project'}
+              </button>
+            </div>
 
-              <div className="p-4 bg-error/10 rounded-lg border border-error/20">
-                <h4 className="font-semibold text-error mb-2">Delete Project</h4>
-                <p className="text-error/80 text-sm mb-4">
-                  This action cannot be undone. This will permanently delete the project and all of its data.
-                </p>
-                
-                <button
-                  onClick={() => setDeleteConfirm(true)}
-                  className="btn btn-error"
-                >
-                  Delete Project
-                </button>
-              </div>
+            <div className="p-4 bg-error/10 rounded-lg border border-error/20">
+              <h4 className="font-semibold text-error mb-2">Delete Project</h4>
+              <p className="text-error/80 text-sm mb-4">
+                This action cannot be undone. This will permanently delete the project and all of its data.
+              </p>
+              
+              <button
+                onClick={() => setDeleteConfirm(true)}
+                className="btn btn-error"
+              >
+                Delete Project
+              </button>
             </div>
-          </div>
         </div>
-      )}
+      </div>
 
       <ConfirmationModal
         isOpen={deleteConfirm}
diff --git a/frontend/src/pages/SharingPage.tsx b/frontend/src/pages/SharingPage.tsx
index 13e193a..cc8dfe8 100644
--- a/frontend/src/pages/SharingPage.tsx
+++ b/frontend/src/pages/SharingPage.tsx
@@ -17,7 +17,6 @@ const SharingPage: React.FC = () => {
   
   const [makePrivateConfirm, setMakePrivateConfirm] = useState(false);
   const [error, setError] = useState('');
-  const [activeSection, setActiveSection] = useState<'overview' | 'team' | 'activity'>('overview');
 
   const handleMakePrivate = async () => {
     if (!selectedProject) return;
@@ -57,34 +56,9 @@ const SharingPage: React.FC = () => {
   }
 
   return (
-    <div className="p-6">
-      {/* Navigation Tabs */}
-      <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 mb-6">
-        <button 
-          className={`tab ${activeSection === 'overview' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('overview')}
-        >
-          Overview
-        </button>
-        {selectedProject.isShared && (
-          <button 
-            className={`tab ${activeSection === 'team' ? 'tab-active' : ''}`}
-            onClick={() => setActiveSection('team')}
-          >
-            Team Management
-          </button>
-        )}
-        <button 
-          className={`tab ${activeSection === 'activity' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('activity')}
-        >
-          Activity Log
-        </button>
-      </div>
-
-      {/* Error Messages */}
+    <div className="space-y-4">
       {error && (
-        <div className="alert alert-error shadow-md mb-6">
+        <div className="alert alert-error shadow-md">
           <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
@@ -93,97 +67,88 @@ const SharingPage: React.FC = () => {
         </div>
       )}
 
-      {/* Overview Section */}
-      {activeSection === 'overview' && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">👥 Sharing Overview</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border">
-              <div className="flex items-center gap-3">
-                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
-                  selectedProject.isShared ? 'bg-success/20' : 'bg-base-300'
-                }`}>
-                  <svg className={`w-4 h-4 ${selectedProject.isShared ? 'text-success' : 'text-base-content/60'}`} 
-                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
-                          d={selectedProject.isShared 
-                            ? "M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
-                            : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
-                  </svg>
-                </div>
-                <div>
-                  <div className={`font-medium text-sm ${selectedProject.isShared ? 'text-success' : 'text-base-content'}`}>
-                    {selectedProject.isShared ? 'Sharing Enabled' : 'Private Project'}
+      {/* Project Sharing */}
+      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
+          <span className="text-xl">👥</span>
+          Project Sharing & Team Management
+        </h2>
+            <div className="space-y-4">
+              {/* Compact Sharing Status */}
+              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border">
+                <div className="flex items-center gap-3">
+                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
+                    selectedProject.isShared ? 'bg-success/20' : 'bg-base-300'
+                  }`}>
+                    <svg className={`w-4 h-4 ${selectedProject.isShared ? 'text-success' : 'text-base-content/60'}`} 
+                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
+                            d={selectedProject.isShared 
+                              ? "M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
+                              : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
+                    </svg>
                   </div>
-                  <div className="text-xs text-base-content/60">
-                    {selectedProject.isShared 
-                      ? 'Team members can access this project' 
-                      : 'Only you can access this project'}
+                  <div>
+                    <div className={`font-medium text-sm ${selectedProject.isShared ? 'text-success' : 'text-base-content'}`}>
+                      {selectedProject.isShared ? 'Sharing Enabled' : 'Private Project'}
+                    </div>
+                    <div className="text-xs text-base-content/60">
+                      {selectedProject.isShared 
+                        ? 'Team members can access this project' 
+                        : 'Only you can access this project'}
+                    </div>
                   </div>
                 </div>
+                
+                {(selectedProject.canManageTeam !== false) && (
+                  <label className="label cursor-pointer gap-2">
+                    <span className="label-text text-xs">Enable</span>
+                    <input 
+                      type="checkbox" 
+                      className="toggle toggle-success toggle-sm" 
+                      checked={selectedProject.isShared}
+                      onChange={() => {
+                        // If toggling off (making private), show confirmation
+                        if (selectedProject.isShared) {
+                          setMakePrivateConfirm(true);
+                        } else {
+                          // If toggling on (making shared), just do it directly
+                          onProjectUpdate(selectedProject.id, { isShared: true }).then(() => {
+                            onProjectRefresh();
+                          });
+                        }
+                      }}
+                    />
+                  </label>
+                )}
               </div>
-              
-              {(selectedProject.canManageTeam !== false) && (
-                <label className="label cursor-pointer gap-2">
-                  <span className="label-text text-xs">Enable</span>
-                  <input 
-                    type="checkbox" 
-                    className="toggle toggle-success toggle-sm" 
-                    checked={selectedProject.isShared}
-                    onChange={() => {
-                      // If toggling off (making private), show confirmation
-                      if (selectedProject.isShared) {
-                        setMakePrivateConfirm(true);
-                      } else {
-                        // If toggling on (making shared), just do it directly
-                        onProjectUpdate(selectedProject.id, { isShared: true }).then(() => {
-                          onProjectRefresh();
-                        });
-                      }
-                    }}
-                  />
-                </label>
-              )}
-            </div>
-          </div>
-        </div>
-      )}
 
-      {/* Team Management Section */}
-      {activeSection === 'team' && selectedProject.isShared && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">👥 Team Management</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <TeamManagement 
-              projectId={selectedProject.id} 
-              canManageTeam={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
-              currentUserId={undefined} // TODO: Get current user ID from auth context
-            />
-          </div>
-        </div>
-      )}
+              {/* Team Management - Only show if sharing is enabled */}
+              {selectedProject.isShared && (
+                <TeamManagement 
+                  projectId={selectedProject.id} 
+                  canManageTeam={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
+                  currentUserId={undefined} // TODO: Get current user ID from auth context
+                />
+              )}
 
-      {/* Activity Log Section */}
-      {activeSection === 'activity' && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">📊 Activity Log</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <p className="text-sm text-base-content/60 mb-4">Your project activity is being tracked</p>
-            <ActivityLog 
-              projectId={selectedProject.id}
-            />
-          </div>
-        </div>
-      )}
+              {/* Activity Log - Always show since activity is tracked regardless of sharing status */}
+              {!selectedProject.isShared && (
+                <div className="mt-4">
+                  <div className="bg-base-100 rounded-lg border-subtle shadow-md p-4 mt-4">
+                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
+                      <span className="text-xl">📊</span>
+                      Activity Log
+                    </h3>
+                    <p className="text-sm text-base-content/60 mb-4">Your project activity is being tracked</p>
+                    <ActivityLog 
+                      projectId={selectedProject.id}
+                    />
+                  </div>
+                </div>
+              )}
+            </div>
+      </div>
 
       <ConfirmationModal
         isOpen={makePrivateConfirm}
