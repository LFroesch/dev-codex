diff --git a/frontend/src/pages/AccountSettingsPage.tsx b/frontend/src/pages/AccountSettingsPage.tsx
index 533b2c0..a1627d1 100644
--- a/frontend/src/pages/AccountSettingsPage.tsx
+++ b/frontend/src/pages/AccountSettingsPage.tsx
@@ -237,7 +237,7 @@ const AccountSettingsPage: React.FC = () => {
 
         {/* Tabs */}
         <div className="flex justify-center mb-6 sm:mb-8 px-2">
-          <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 w-full max-w-4xl overflow-x-auto">
+          <div className="tabs tabs-boxed tabs-lg bg-base-200 shadow-lg border border-base-content/10 w-full max-w-4xl overflow-x-auto">
           <button 
             className={`tab tab-sm sm:tab-lg font-medium sm:font-bold text-xs sm:text-base whitespace-nowrap ${activeTab === 'theme' ? 'tab-active' : ''}`}
             onClick={() => setActiveTab('theme')}
@@ -440,7 +440,7 @@ const AccountSettingsPage: React.FC = () => {
                 {user && (
                   <>
                     {/* Personal Information */}
-                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
+                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                       <input type="checkbox" defaultChecked />
                       <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
                         👤 Personal Information
@@ -501,7 +501,7 @@ const AccountSettingsPage: React.FC = () => {
                     </div>
 
                     {/* Bio Section */}
-                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 rounded-lg mb-4">
+                    <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
                       <div className="p-4">
                         {/* Header with title and controls */}
                         <div className="flex items-center justify-between">
@@ -584,7 +584,7 @@ const AccountSettingsPage: React.FC = () => {
                     </div>
 
                     {/* Public Profile Settings */}
-                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 rounded-lg mb-4">
+                    <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
                       <div className="p-4">
                         {/* Header with title and controls */}
                         <div className="flex items-center justify-between">
@@ -822,7 +822,7 @@ const AccountSettingsPage: React.FC = () => {
                     </div>
 
                     {/* Privacy Information */}
-                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
+                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                       <input type="checkbox" />
                       <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
                         📋 Privacy Information
diff --git a/frontend/src/pages/DeploymentPage.tsx b/frontend/src/pages/DeploymentPage.tsx
index 1d9f38a..0e4a0e8 100644
--- a/frontend/src/pages/DeploymentPage.tsx
+++ b/frontend/src/pages/DeploymentPage.tsx
@@ -19,9 +19,6 @@ const DeploymentPage: React.FC = () => {
   const [deploymentData, setDeploymentData] = useState<DeploymentData>({});
   const [loading, setLoading] = useState(false);
   const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
-  
-  // Section visibility states
-  const [activeSection, setActiveSection] = useState<'overview' | 'basic' | 'build' | 'env' | 'notes'>('overview');
 
   useEffect(() => {
     if (selectedProject) {
@@ -88,8 +85,7 @@ const DeploymentPage: React.FC = () => {
     return (
       <div className="flex items-center justify-center h-full">
         <div className="text-center">
-          <div className="text-6xl mb-4">🚀</div>
-          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
+          <h2 className="text-2xl font-semibold mb-4">No project selected</h2>
           <p className="text-base-content/60">Select a project to manage deployment settings</p>
         </div>
       </div>
@@ -97,162 +93,28 @@ const DeploymentPage: React.FC = () => {
   }
 
   return (
-    <div className="space-y-4">
-      {/* Section Navigation */}
-      <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90">
-        <button 
-          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'overview' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('overview')}
-        >
-          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
-          </svg>
-          Overview
-        </button>
-        <button 
-          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'basic' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('basic')}
-        >
-          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
-          </svg>
-          Basic Info
-        </button>
-        <button 
-          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'build' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('build')}
-        >
-          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
-          </svg>
-          Build & Deploy
-        </button>
-        <button 
-          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'env' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('env')}
-        >
-          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
-          </svg>
-          Environment
-        </button>
-        <button 
-          className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'notes' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('notes')}
+    <div className="p-6 space-y-8">
+      <div className="flex justify-between items-center">
+        <div>
+          <h1 className="text-3xl font-bold">Deployment</h1>
+          <p className="text-base-content/60 mt-1">Manage deployment settings, commands, and environment configuration</p>
+        </div>
+        <button
+          onClick={handleSave}
+          disabled={loading || !hasUnsavedChanges}
+          className={`btn ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
         >
-          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
-          </svg>
-          Notes
+          {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
         </button>
       </div>
 
-      {/* Section Content */}
-      {activeSection === 'overview' && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-          <div className="flex justify-between items-center mb-4">
-            <h2 className="text-lg font-semibold flex items-center gap-2">
-              <span className="text-xl">📊</span>
-              <span className='px-2 py-1 rounded-md bg-base-300 inline-block w-fit'>Deployment Overview</span>
-            </h2>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasUnsavedChanges}
-              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
-            >
-              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
-            </button>
-          </div>
-          
-          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
-            <div className="bg-base-200 rounded-lg p-4">
-              <div className="flex items-center gap-3 mb-2">
-                <div className={`w-3 h-3 rounded-full ${
-                  deploymentData.deploymentStatus === 'active' ? 'bg-success' :
-                  deploymentData.deploymentStatus === 'error' ? 'bg-error' : 'bg-warning'
-                }`}></div>
-                <span className="font-medium text-sm">Status</span>
-              </div>
-              <p className="text-sm">
-                {deploymentData.deploymentStatus === 'active' ? '🟢 Active' :
-                 deploymentData.deploymentStatus === 'error' ? '🔴 Error' : '🟡 Inactive'}
-              </p>
-            </div>
+      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
+        {/* Basic Deployment Info */}
+        <div className="card bg-base-200 shadow-lg">
+          <div className="card-body">
+            <h2 className="card-title text-xl mb-4">Basic Information</h2>
             
-            <div className="bg-base-200 rounded-lg p-4">
-              <div className="flex items-center gap-3 mb-2">
-                <span className="text-sm">🌐</span>
-                <span className="font-medium text-sm">Platform</span>
-              </div>
-              <p className="text-sm">{deploymentData.deploymentPlatform || 'Not configured'}</p>
-            </div>
-            
-            <div className="bg-base-200 rounded-lg p-4">
-              <div className="flex items-center gap-3 mb-2">
-                <span className="text-sm">🔗</span>
-                <span className="font-medium text-sm">Live URL</span>
-              </div>
-              <p className="text-sm truncate">{deploymentData.liveUrl || 'Not configured'}</p>
-            </div>
-            
-            <div className="bg-base-200 rounded-lg p-4">
-              <div className="flex items-center gap-3 mb-2">
-                <span className="text-sm">📅</span>
-                <span className="font-medium text-sm">Last Deploy</span>
-              </div>
-              <p className="text-sm">
-                {deploymentData.lastDeployDate ? 
-                  new Date(deploymentData.lastDeployDate).toLocaleDateString() : 
-                  'Never deployed'}
-              </p>
-            </div>
-          </div>
-          
-          {deploymentData.liveUrl && (
-            <div className="mt-4">
-              <a 
-                href={deploymentData.liveUrl.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`}
-                target="_blank" 
-                rel="noopener noreferrer"
-                className="btn btn-primary btn-sm gap-2"
-                onClick={(e) => {
-                  const url = deploymentData.liveUrl?.startsWith('http') ? deploymentData.liveUrl : `https://${deploymentData.liveUrl}`;
-                  console.log('Opening URL:', url);
-                  if (!url || url === 'https://') {
-                    e.preventDefault();
-                    alert('Please enter a valid URL first');
-                  }
-                }}
-              >
-                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
-                </svg>
-                Open Live Site
-              </a>
-            </div>
-          )}
-        </div>
-      )}
-
-      {activeSection === 'basic' && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-          <div className="flex justify-between items-center mb-4">
-            <h2 className="text-lg font-semibold flex items-center gap-2">
-              <span className="text-xl">📋</span>
-              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Basic Information</span>
-            </h2>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasUnsavedChanges}
-              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
-            >
-              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
-            </button>
-          </div>
-          
-          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
-            <div className="form-control">
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">Live URL</span>
               </label>
@@ -265,7 +127,7 @@ const DeploymentPage: React.FC = () => {
               />
             </div>
 
-            <div className="form-control">
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">GitHub Repository</span>
               </label>
@@ -278,7 +140,7 @@ const DeploymentPage: React.FC = () => {
               />
             </div>
 
-            <div className="form-control">
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">Deployment Platform</span>
               </label>
@@ -307,26 +169,13 @@ const DeploymentPage: React.FC = () => {
             </div>
           </div>
         </div>
-      )}
 
-      {activeSection === 'build' && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-          <div className="flex justify-between items-center mb-4">
-            <h2 className="text-lg font-semibold flex items-center gap-2">
-              <span className="text-xl">⚙️</span>
-              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Build & Deploy</span>
-            </h2>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasUnsavedChanges}
-              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
-            >
-              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
-            </button>
-          </div>
-          
-          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
-            <div className="form-control">
+        {/* Build & Deploy Commands */}
+        <div className="card bg-base-200 shadow-lg">
+          <div className="card-body">
+            <h2 className="card-title text-xl mb-4">Build & Deploy</h2>
+            
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">Build Command</span>
               </label>
@@ -339,7 +188,7 @@ const DeploymentPage: React.FC = () => {
               />
             </div>
 
-            <div className="form-control">
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">Start Command</span>
               </label>
@@ -352,7 +201,7 @@ const DeploymentPage: React.FC = () => {
               />
             </div>
 
-            <div className="form-control">
+            <div className="form-control mb-4">
               <label className="label">
                 <span className="label-text font-medium">Deployment Branch</span>
               </label>
@@ -384,102 +233,75 @@ const DeploymentPage: React.FC = () => {
             </div>
           </div>
         </div>
-      )}
 
-      {activeSection === 'env' && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-          <div className="flex justify-between items-center mb-4">
-            <h2 className="text-lg font-semibold flex items-center gap-2">
-              <span className="text-xl">🔐</span>
-              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Environment Variables</span>
-            </h2>
-            <div className="flex gap-2">
+
+        {/* Environment Variables */}
+        <div className="card bg-base-200 shadow-lg lg:col-span-2">
+          <div className="card-body">
+            <div className="flex justify-between items-center mb-4">
+              <h2 className="card-title text-xl">Environment Variables</h2>
               <button
                 onClick={addEnvironmentVariable}
                 className="btn btn-primary btn-sm"
               >
                 Add Variable
               </button>
-              <button
-                onClick={handleSave}
-                disabled={loading || !hasUnsavedChanges}
-                className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
-              >
-                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
-              </button>
             </div>
-          </div>
-          
-          <div className="alert alert-warning mb-4">
-            <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
-              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
-            </svg>
-            <span className="text-sm">
-              <strong>Security Warning:</strong> Never store actual secrets or API keys here. Use this for documentation only (variable names, with dummy values or locations).
-            </span>
-          </div>
-          
-          <div className="space-y-2">
-            {(deploymentData.environmentVariables || []).map((envVar, index) => (
-              <div key={index} className="flex gap-2">
-                <input
-                  type="text"
-                  placeholder="Key"
-                  className="input input-bordered w-1/3 font-mono"
-                  value={envVar.key}
-                  onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
-                />
-                <input
-                  type="text"
-                  placeholder="Value"
-                  className="input input-bordered flex-1 font-mono"
-                  value={envVar.value}
-                  onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
-                />
-                <button
-                  onClick={() => removeEnvironmentVariable(index)}
-                  className="btn btn-error btn-sm"
-                >
-                  Remove
-                </button>
-              </div>
-            ))}
-            {(!deploymentData.environmentVariables || deploymentData.environmentVariables.length === 0) && (
-              <div className="text-center py-12">
-                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
-                  <span className="text-2xl">🔐</span>
+            
+            <div className="alert alert-warning mb-4">
+              <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
+                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
+              </svg>
+              <span className="text-sm">
+                <strong>Security Warning:</strong> Never store actual secrets or API keys here. Use this for documentation only (variable names, with dummy values or locations).
+              </span>
+            </div>
+            
+            <div className="space-y-2">
+              {(deploymentData.environmentVariables || []).map((envVar, index) => (
+                <div key={index} className="flex gap-2">
+                  <input
+                    type="text"
+                    placeholder="Key"
+                    className="input input-bordered w-1/3 font-mono"
+                    value={envVar.key}
+                    onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
+                  />
+                  <input
+                    type="text"
+                    placeholder="Value"
+                    className="input input-bordered flex-1 font-mono"
+                    value={envVar.value}
+                    onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
+                  />
+                  <button
+                    onClick={() => removeEnvironmentVariable(index)}
+                    className="btn btn-error btn-sm"
+                  >
+                    Remove
+                  </button>
                 </div>
-                <h3 className="text-lg font-medium mb-2 text-base-content/80">No environment variables</h3>
-                <p className="text-sm text-base-content/60">Add your first environment variable above</p>
-              </div>
-            )}
+              ))}
+              {(!deploymentData.environmentVariables || deploymentData.environmentVariables.length === 0) && (
+                <p className="text-base-content/60 text-center py-4">No environment variables configured</p>
+              )}
+            </div>
           </div>
         </div>
-      )}
 
-      {activeSection === 'notes' && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-          <div className="flex justify-between items-center mb-4">
-            <h2 className="text-lg font-semibold flex items-center gap-2">
-              <span className="text-xl">📝</span>
-              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">Deployment Notes</span>
-            </h2>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasUnsavedChanges}
-              className={`btn btn-sm ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
-            >
-              {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
-            </button>
+        {/* Notes */}
+        <div className="card bg-base-200 shadow-lg lg:col-span-2">
+          <div className="card-body">
+            <h2 className="card-title text-xl mb-4">📝 Deployment Notes</h2>
+            <textarea
+              className="textarea textarea-bordered w-full h-32"
+              placeholder="Add notes about deployment process, issues, or configurations..."
+              value={deploymentData.notes || ''}
+              onChange={(e) => updateField('notes', e.target.value)}
+            />
           </div>
-          <textarea
-            className="textarea textarea-bordered w-full h-64"
-            placeholder="Add notes about deployment process, issues, configurations, or any important information..."
-            value={deploymentData.notes || ''}
-            onChange={(e) => updateField('notes', e.target.value)}
-          />
         </div>
-      )}
+      </div>
     </div>
   );
 };
diff --git a/frontend/src/pages/DocsPage.tsx b/frontend/src/pages/DocsPage.tsx
index 56955f2..7476b9b 100644
--- a/frontend/src/pages/DocsPage.tsx
+++ b/frontend/src/pages/DocsPage.tsx
@@ -20,8 +20,6 @@ const DocsPage: React.FC = () => {
   const [editData, setEditData] = useState({ type: 'Model' as Doc['type'], title: '', content: '' });
   const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
   const [error, setError] = useState('');
-  const [showCreateForm, setShowCreateForm] = useState(false);
-  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('all');
 
   const toggleDocExpanded = (docId: string) => {
     const newExpanded = new Set(expandedDocs);
@@ -54,7 +52,6 @@ const DocsPage: React.FC = () => {
     try {
       await projectAPI.createDoc(selectedProject.id, newDoc);
       setNewDoc({ type: 'Model', title: '', content: '' });
-      setShowCreateForm(false);
       await onProjectRefresh();
     } catch (err) {
       setError('Failed to add documentation template');
@@ -252,7 +249,7 @@ React App:
   const hasAnyDocs = selectedProject.docs.length > 0;
 
   return (
-    <div className="space-y-4">
+    <div className="p-6 space-y-6">
       {error && (
         <div className="alert alert-error shadow-md">
           <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
@@ -262,162 +259,105 @@ React App:
         </div>
       )}
 
-      {/* Template Categories Navigation */}
-      {categoriesWithDocs.length > 0 && (
-        <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 overflow-x-auto">
-          <button 
-            className={`tab tab-sm min-h-10 font-bold text-sm ${activeTemplateCategory === 'all' ? 'tab-active' : ''}`}
-            onClick={() => setActiveTemplateCategory('all')}
-          >
-            📚 All Templates ({selectedProject.docs?.length || 0})
-          </button>
-          {categoriesWithDocs.map(typeInfo => (
-            <button 
-              key={typeInfo.value}
-              className={`tab tab-sm min-h-10 font-bold text-sm ${activeTemplateCategory === typeInfo.value ? 'tab-active' : ''}`}
-              onClick={() => setActiveTemplateCategory(typeInfo.value)}
-            >
-              {typeInfo.emoji} {typeInfo.label} ({docsByType[typeInfo.value]?.length || 0})
-            </button>
-          ))}
+      {/* Create New Template */}
+      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10 mb-4">
+        <input type="checkbox" defaultChecked={!hasAnyDocs} />
+        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
+          Create New Documentation Template
         </div>
-      )}
+        <div className="collapse-content">
+          <div className="space-y-4 pt-4">
+            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
+              <div className="form-control">
+                <label className="label">
+                  <span className="label-text font-medium">Template Type</span>
+                </label>
+                <select
+                  value={newDoc.type}
+                  onChange={(e) => setNewDoc({...newDoc, type: e.target.value as Doc['type']})}
+                  className="select select-bordered border-base-300"
+                >
+                  {docTypes.map(type => (
+                    <option key={type.value} value={type.value}>
+                      {type.emoji} {type.label} - {type.description}
+                    </option>
+                  ))}
+                </select>
+              </div>
+
+              <div className="form-control md:col-span-2">
+                <label className="label">
+                  <span className="label-text font-medium">Template Title</span>
+                </label>
+                <input
+                  type="text"
+                  value={newDoc.title}
+                  onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
+                  className="input input-bordered border-base-300"
+                  placeholder="Enter template title..."
+                />
+              </div>
+            </div>
 
-      {/* Create New Template */}
-      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-        {!showCreateForm ? (
-          <button
-            onClick={() => setShowCreateForm(true)}
-            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
-          >
-            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
-              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
-              </svg>
+            <div className="form-control">
+              <label className="label">
+                <span className="label-text font-medium">Template Content</span>
+                <button
+                  type="button"
+                  onClick={() => setNewDoc({...newDoc, content: getTemplateExample(newDoc.type)})}
+                  className="btn btn-xs btn-outline"
+                >
+                  Use Example
+                </button>
+              </label>
+              <textarea
+                value={newDoc.content}
+                onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
+                className="textarea textarea-bordered border-base-300 h-[400px]"
+                placeholder="Enter your pseudocode/planning template..."
+              />
             </div>
-            <span className="text-base-content/60">Create new documentation template...</span>
-          </button>
-        ) : (
-          <div>
-            <div className="flex items-center justify-between mb-4">
-              <h2 className="text-lg font-semibold flex items-center gap-2">
-                <span className="text-xl">📝</span>
-                Create New Documentation Template
-              </h2>
+
+            <div className="flex justify-end">
               <button
-                type="button"
-                onClick={() => {
-                  setShowCreateForm(false);
-                  setNewDoc({ type: 'Model', title: '', content: '' });
-                }}
-                className="text-base-content/40 hover:text-base-content/60 transition-colors"
+                onClick={handleAddDoc}
+                disabled={addingDoc || !newDoc.title.trim() || !newDoc.content.trim()}
+                className="btn btn-primary"
               >
-                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
-                </svg>
+                {addingDoc ? 'Adding...' : 'Add Template'}
               </button>
             </div>
-            <div className="space-y-4">
-                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
-                  <div className="form-control">
-                    <label className="label">
-                      <span className="label-text font-medium">Template Type</span>
-                    </label>
-                    <select
-                      value={newDoc.type}
-                      onChange={(e) => setNewDoc({...newDoc, type: e.target.value as Doc['type']})}
-                      className="select select-bordered border-base-300"
-                    >
-                      {docTypes.map(type => (
-                        <option key={type.value} value={type.value}>
-                          {type.emoji} {type.label} - {type.description}
-                        </option>
-                      ))}
-                    </select>
-                  </div>
-
-                  <div className="form-control md:col-span-2">
-                    <label className="label">
-                      <span className="label-text font-medium">Template Title</span>
-                    </label>
-                    <input
-                      type="text"
-                      value={newDoc.title}
-                      onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
-                      className="input input-bordered border-base-300"
-                      placeholder="Enter template title..."
-                    />
-                  </div>
-                </div>
-
-                <div className="form-control">
-                  <label className="label">
-                    <span className="label-text font-medium">Template Content</span>
-                    <button
-                      type="button"
-                      onClick={() => setNewDoc({...newDoc, content: getTemplateExample(newDoc.type)})}
-                      className="btn btn-xs btn-outline"
-                    >
-                      Use Example
-                    </button>
-                  </label>
-                  <textarea
-                    value={newDoc.content}
-                    onChange={(e) => setNewDoc({...newDoc, content: e.target.value})}
-                    className="textarea textarea-bordered border-base-300 h-[400px]"
-                    placeholder="Enter your pseudocode/planning template..."
-                  />
-                </div>
-
-                <div className="flex justify-end">
-                  <button
-                    onClick={handleAddDoc}
-                    disabled={addingDoc || !newDoc.title.trim() || !newDoc.content.trim()}
-                    className="btn btn-primary"
-                  >
-                    {addingDoc ? 'Adding...' : 'Add Template'}
-                  </button>
-                </div>
-            </div>
           </div>
-        )}
+        </div>
       </div>
 
       {/* Show message if no docs exist */}
       {!hasAnyDocs && (
         <div className="text-center py-12">
-          <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
-            <span className="text-2xl">📚</span>
-          </div>
-          <h3 className="text-lg font-medium mb-2 text-base-content/80">No documentation templates yet</h3>
-          <p className="text-sm text-base-content/60">Create your first template above to get started documenting your project</p>
+          <div className="text-6xl mb-4">📚</div>
+          <h3 className="text-xl font-semibold mb-2">No documentation templates yet</h3>
+          <p className="text-base-content/60">Create your first template above to get started documenting your project</p>
         </div>
       )}
 
-      {/* Template Categories Content */}
-      {categoriesWithDocs.length > 0 && (
-        <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
-              <span className="text-xl">
-                {activeTemplateCategory === 'all' ? '📚' : categoriesWithDocs.find(c => c.value === activeTemplateCategory)?.emoji}
-              </span>
-              <span className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-                {activeTemplateCategory === 'all' 
-                  ? 'All Documentation Templates' 
-                  : `${categoriesWithDocs.find(c => c.value === activeTemplateCategory)?.label} Templates`
-                }
-              </span>
-            </h3>
-            <div className="space-y-3">
-                  {(activeTemplateCategory === 'all' 
-                    ? selectedProject.docs || []
-                    : docsByType[activeTemplateCategory as Doc['type']] || []
-                  ).map((doc: any) => {
+      {/* Template Categories - Only show categories with docs */}
+      {categoriesWithDocs.map(typeInfo => {
+        const docs = docsByType[typeInfo.value] || [];
+        return (
+          <div key={typeInfo.value} className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
+            <input type="checkbox" defaultChecked={true} />
+            <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
+              {typeInfo.label} Templates ({docs.length})
+            </div>
+            <div className="collapse-content">
+              <div className="pt-4">
+                <div className="space-y-4">
+                  {docs.map(doc => {
                     const isExpanded = expandedDocs.has(doc.id);
                     const isEditing = editingDoc === doc.id;
-                    const docType = docTypes.find(t => t.value === doc.type);
                     return (
-                      <div key={doc.id} className="bg-base-100 rounded-lg border border-base-300 hover:border-primary/30 transition-all duration-200 p-3">
+                      <div key={doc.id} className="bg-base-100 shadow-lg border border-base-content/10 rounded-lg mb-4">
+                        <div className="p-4">
                           {/* Header with title and controls */}
                           <div className="flex items-center justify-between">
                             <button
@@ -431,15 +371,8 @@ React App:
                                 </svg>
                               </div>
                               <div className="flex-1">
-                                <div className="flex items-center gap-3 mb-1">
-                                  <h3 className="font-semibold text-base">{doc.title}</h3>
-                                  {activeTemplateCategory === 'all' && docType && (
-                                    <span className="px-2 py-1 rounded-md bg-base-300 text-xs font-medium">
-                                      {docType.emoji} {docType.label}
-                                    </span>
-                                  )}
-                                </div>
-                                <div className="text-xs text-base-content/50">
+                                <h3 className="font-semibold text-lg">{doc.title}</h3>
+                                <div className="text-xs text-base-content/50 mt-1">
                                   Created: {new Date(doc.createdAt).toLocaleDateString()}
                                   {doc.updatedAt !== doc.createdAt && (
                                     <> • Updated: {new Date(doc.updatedAt).toLocaleDateString()}</>
@@ -565,11 +498,15 @@ React App:
                             </div>
                           )}
                         </div>
-                      );
+                      </div>
+                    );
                   })}
+                </div>
+              </div>
             </div>
-        </div>
-      )}
+          </div>
+        );
+      })}
     </div>
   );
 };
diff --git a/frontend/src/pages/PublicPage.tsx b/frontend/src/pages/PublicPage.tsx
index bd66335..32ac073 100644
--- a/frontend/src/pages/PublicPage.tsx
+++ b/frontend/src/pages/PublicPage.tsx
@@ -31,9 +31,12 @@ const PublicPage: React.FC = () => {
     timestamps: true,
   });
 
-  
-  // Section navigation state
-  const [activeSection, setActiveSection] = useState<'overview' | 'sharing' | 'url' | 'visibility' | 'privacy'>('overview');
+  // Collapsible states
+  const [isPublicSharingExpanded, setIsPublicSharingExpanded] = useState(false);
+  const [isPublicUrlExpanded, setIsPublicUrlExpanded] = useState(false);
+  const [isVisibilityControlsExpanded, setIsVisibilityControlsExpanded] = useState(false);
+  const [isPrivacyInfoExpanded, setIsPrivacyInfoExpanded] = useState(false);
+  const [isShareWorkExpanded, setIsShareWorkExpanded] = useState(false);
 
   useEffect(() => {
     if (selectedProject) {
@@ -143,48 +146,10 @@ const PublicPage: React.FC = () => {
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
-        <button 
-          className={`tab ${activeSection === 'sharing' ? 'tab-active' : ''}`}
-          onClick={() => setActiveSection('sharing')}
-        >
-          Public Settings
-        </button>
-        {isPublic && (
-          <>
-            <button 
-              className={`tab ${activeSection === 'url' ? 'tab-active' : ''}`}
-              onClick={() => setActiveSection('url')}
-            >
-              URL & Preview
-            </button>
-            <button 
-              className={`tab ${activeSection === 'visibility' ? 'tab-active' : ''}`}
-              onClick={() => setActiveSection('visibility')}
-            >
-              Visibility Controls
-            </button>
-            <button 
-              className={`tab ${activeSection === 'privacy' ? 'tab-active' : ''}`}
-              onClick={() => setActiveSection('privacy')}
-            >
-              Privacy Info
-            </button>
-          </>
-        )}
-      </div>
-
+    <div className="p-6 space-y-6">
       {/* Success/Error Messages */}
       {success && (
-        <div className="alert alert-success shadow-md mb-6">
+        <div className="alert alert-success shadow-md">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
@@ -193,7 +158,7 @@ const PublicPage: React.FC = () => {
       )}
 
       {error && (
-        <div className="alert alert-error shadow-md mb-6">
+        <div className="alert alert-error shadow-md">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
           </svg>
@@ -201,159 +166,148 @@ const PublicPage: React.FC = () => {
         </div>
       )}
 
-      {/* Overview Section */}
-      {activeSection === 'overview' && (
-        <div className="space-y-4">
-          <div className="flex items-center justify-between">
-            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-              <h2 className="text-xl font-bold mb-0">Public Sharing Overview</h2>
-            </div>
+      {/* Public Sharing Settings */}
+      <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
+        <div className="p-4">
+          {/* Header with title and controls */}
+          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
             <button
-              onClick={handleSave}
-              disabled={loading || !hasChanges()}
-              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
+              onClick={() => setIsPublicSharingExpanded(!isPublicSharingExpanded)}
+              className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
             >
-              {loading ? (
-                <>
-                  <span className="loading loading-spinner loading-sm"></span>
-                  Saving...
-                </>
-              ) : hasChanges() ? (
-                'Save Changes'
-              ) : (
-                'Saved'
-              )}
-            </button>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <div className="flex items-center gap-4 mb-4">
-              <div 
-                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
-                style={{ backgroundColor: selectedProject.color }}
-              >
-                {selectedProject.name.charAt(0).toUpperCase()}
+              <div className={`transform transition-transform duration-200 ${isPublicSharingExpanded ? 'rotate-90' : ''}`}>
+                <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
+                </svg>
               </div>
               <div className="flex-1">
-                <h3 className="text-2xl font-semibold">{selectedProject.name}</h3>
-                <p className="text-base-content/70 mb-2">{selectedProject.description}</p>
-                <div className="flex items-center gap-3">
-                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPublic ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
-                    {isPublic ? '🌐 Public' : '🔒 Private'}
-                  </span>
-                  {isPublic && (
-                    <span className="text-sm text-base-content/60">
-                      Accessible at: /project/{publicSlug || selectedProject.id}
-                    </span>
-                  )}
-                </div>
+                <h3 className="font-semibold text-lg">🌐 Public Sharing Settings</h3>
+                <p className="text-sm text-base-content/70">
+                  {isPublic ? 'Project is public' : 'Project is private'}
+                </p>
               </div>
-            </div>
+            </button>
             
-            {isPublic && (
-              <div className="flex flex-wrap gap-2">
+            <div className="flex flex-wrap gap-2 ml-0 sm:ml-4 mt-2 sm:mt-0">
+              {isPublic && (
+              <>
                 <button
-                  onClick={copyPublicUrl}
-                  className="btn btn-outline btn-sm gap-2"
+                onClick={copyPublicUrl}
+                className="btn btn-outline btn-sm gap-2"
                 >
-                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
-                  </svg>
-                  Copy URL
+                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
+                </svg>
+                Copy URL
                 </button>
                 <Link
-                  to={`/project/${publicSlug || selectedProject.id}`}
-                  className="btn btn-outline btn-sm gap-2"
+                to={`/project/${publicSlug || selectedProject.id}`}
+                className="btn btn-outline btn-sm gap-2"
                 >
-                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
-                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
-                  </svg>
-                  View Public Page
+                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
+                </svg>
+                {publicSlug ? `/project/${publicSlug}` : `/project/${selectedProject.id}`}
                 </Link>
-              </div>
-            )}
+              </>
+              )}
+              <button
+                onClick={handleSave}
+                disabled={loading || !hasChanges()}
+                className={`btn btn-sm ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
+              >
+                {loading ? (
+                  <>
+                    <span className="loading loading-spinner loading-sm"></span>
+                    Saving...
+                  </>
+                ) : hasChanges() ? (
+                  'Save Changes'
+                ) : (
+                  'Saved'
+                )}
+              </button>
+            </div>
           </div>
-        </div>
-      )}
 
-      {/* Sharing Settings Section */}
-      {activeSection === 'sharing' && (
-        <div className="space-y-4">
-          <div className="flex items-center justify-between">
-            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-              <h2 className="text-xl font-bold mb-0">🌐 Sharing + Settings</h2>
+          {/* Collapsible content */}
+          {isPublicSharingExpanded && (
+            <div className="mt-4 border-t border-base-300 pt-4 bg-base-100 rounded-b-lg p-4 -mx-4 -mb-4">
+              {/* Public Status Toggle */}
+              <div className="form-control">
+                <label className="label cursor-pointer">
+                  <div className="flex-1">
+                    <span className="label-text text-lg font-semibold">🔓 Make Project Public</span>
+                    <p className="text-sm text-base-content/60 mt-1">
+                      Enable this to make your project discoverable in the community discover page. 
+                      Others will be able to view your project details, tech stack, and documentation.
+                    </p>
+                    {isPublic && (
+                      <p className="text-sm text-success font-medium mt-2">
+                        ✅ Your project is publicly accessible
+                      </p>
+                    )}
+                  </div>
+                  <input
+                    type="checkbox"
+                    className="toggle toggle-primary toggle-lg"
+                    checked={isPublic}
+                    onChange={(e) => setIsPublic(e.target.checked)}
+                  />
+                </label>
+              </div>
             </div>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasChanges()}
-              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
-            >
-              {loading ? (
-                <>
-                  <span className="loading loading-spinner loading-sm"></span>
-                  Saving...
-                </>
-              ) : hasChanges() ? (
-                'Save Changes'
-              ) : (
-                'Saved'
-              )}
-            </button>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-            <div className="form-control">
-              <label className="label cursor-pointer">
+          )}
+        </div>
+      </div>
+
+      {/* Public URL Configuration */}
+      {isPublic && (
+        <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
+          <div className="p-4">
+            {/* Header with title and controls */}
+            <div className="flex items-center justify-between">
+              <button
+                onClick={() => setIsPublicUrlExpanded(!isPublicUrlExpanded)}
+                className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
+              >
+                <div className={`transform transition-transform duration-200 ${isPublicUrlExpanded ? 'rotate-90' : ''}`}>
+                  <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
+                  </svg>
+                </div>
                 <div className="flex-1">
-                  <span className="label-text text-lg font-semibold">🔓 Make Project Public</span>
-                  <p className="text-sm text-base-content/60 mt-1">
-                    Enable this to make your project discoverable in the community discover page. 
-                    Others will be able to view your project details, tech stack, and documentation.
+                  <h3 className="font-semibold text-lg">🔗 Public URL Settings</h3>
+                  <p className="text-sm text-base-content/70">
+                    Customize your project's public URL
                   </p>
-                  {isPublic && (
-                    <p className="text-sm text-success font-medium mt-2">
-                      ✅ Your project is publicly accessible
-                    </p>
-                  )}
                 </div>
-                <input
-                  type="checkbox"
-                  className="toggle toggle-primary toggle-lg"
-                  checked={isPublic}
-                  onChange={(e) => setIsPublic(e.target.checked)}
-                />
-              </label>
+              </button>
+              
+              <div className="flex gap-2 ml-4">
+                <button
+                  onClick={handleSave}
+                  disabled={loading || !hasChanges()}
+                  className={`btn btn-sm ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
+                >
+                  {loading ? (
+                    <>
+                      <span className="loading loading-spinner loading-sm"></span>
+                      Saving...
+                    </>
+                  ) : hasChanges() ? (
+                    'Save Changes'
+                  ) : (
+                    'Saved'
+                  )}
+                </button>
+              </div>
             </div>
-          </div>
-        </div>
-      )}
 
-      {/* URL & Preview Section */}
-      {activeSection === 'url' && isPublic && (
-        <div className="space-y-4">
-          <div className="flex items-center justify-between">
-            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-              <h2 className="text-xl font-bold mb-0">🔗 URL & Preview</h2>
-            </div>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasChanges()}
-              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
-            >
-              {loading ? (
-                <>
-                  <span className="loading loading-spinner loading-sm"></span>
-                  Saving...
-                </>
-              ) : hasChanges() ? (
-                'Save Changes'
-              ) : (
-                'Saved'
-              )}
-            </button>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4 space-y-4">
+            {/* Collapsible content */}
+            {isPublicUrlExpanded && (
+              <div className="mt-4 border-t border-base-300 pt-4 space-y-4 bg-base-100 rounded-b-lg p-4 -mx-4 -mb-4">
+            
             {/* Custom Slug */}
             <div className="form-control">
               <label className="label">
@@ -454,36 +408,58 @@ const PublicPage: React.FC = () => {
                 </div>
               </div>
             </div>
+              </div>
+            )}
           </div>
         </div>
       )}
 
-      {/* Visibility Controls Section */}
-      {activeSection === 'visibility' && isPublic && (
-        <div className="space-y-4">
-          <div className="flex items-center justify-between">
-            <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-              <h2 className="text-xl font-bold mb-0">🔧 Visibility Controls</h2>
+      {/* Visibility Controls */}
+      {isPublic && (
+        <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
+          <div className="p-4">
+            {/* Header with title and controls */}
+            <div className="flex items-center justify-between">
+              <button
+                onClick={() => setIsVisibilityControlsExpanded(!isVisibilityControlsExpanded)}
+                className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
+              >
+                <div className={`transform transition-transform duration-200 ${isVisibilityControlsExpanded ? 'rotate-90' : ''}`}>
+                  <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
+                  </svg>
+                </div>
+                <div className="flex-1">
+                  <h3 className="font-semibold text-lg">🔧 Visibility Controls</h3>
+                  <p className="text-sm text-base-content/70">
+                    Choose what information to include
+                  </p>
+                </div>
+              </button>
+              
+              <div className="flex gap-2 ml-4">
+                <button
+                  onClick={handleSave}
+                  disabled={loading || !hasChanges()}
+                  className={`btn btn-sm ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
+                >
+                  {loading ? (
+                    <>
+                      <span className="loading loading-spinner loading-sm"></span>
+                      Saving...
+                    </>
+                  ) : hasChanges() ? (
+                    'Save Changes'
+                  ) : (
+                    'Saved'
+                  )}
+                </button>
+              </div>
             </div>
-            <button
-              onClick={handleSave}
-              disabled={loading || !hasChanges()}
-              className={`btn ${hasChanges() ? 'btn-primary' : 'btn-ghost'}`}
-            >
-              {loading ? (
-                <>
-                  <span className="loading loading-spinner loading-sm"></span>
-                  Saving...
-                </>
-              ) : hasChanges() ? (
-                'Save Changes'
-              ) : (
-                'Saved'
-              )}
-            </button>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+
+            {/* Collapsible content */}
+            {isVisibilityControlsExpanded && (
+              <div className="mt-4 border-t border-base-300 pt-4 space-y-4 bg-base-100 rounded-b-lg p-4 -mx-4 -mb-4">
             <p className="text-sm text-base-content/60 mb-4">
               Choose what information to include on your public project page.
             </p>
@@ -516,19 +492,41 @@ const PublicPage: React.FC = () => {
                   </span>
                 </label>
               ))}
-            </div>
+              </div>
+              </div>
+            )}
           </div>
         </div>
       )}
 
-      {/* Privacy Info Section */}
-      {activeSection === 'privacy' && isPublic && (
-        <div className="space-y-4">
-          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
-            <h2 className="text-xl font-bold mb-0">📋 Privacy Information</h2>
-          </div>
-          
-          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
+      {/* What Gets Shared */}
+      {isPublic && (
+        <div className="bg-base-200 shadow-lg border border-base-content/10 rounded-lg mb-4">
+          <div className="p-4">
+            {/* Header with title and controls */}
+            <div className="flex items-center justify-between">
+              <button
+                onClick={() => setIsPrivacyInfoExpanded(!isPrivacyInfoExpanded)}
+                className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
+              >
+                <div className={`transform transition-transform duration-200 ${isPrivacyInfoExpanded ? 'rotate-90' : ''}`}>
+                  <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
+                  </svg>
+                </div>
+                <div className="flex-1">
+                  <h3 className="font-semibold text-lg">📋 Privacy Information</h3>
+                  <p className="text-sm text-base-content/70">
+                    What information is shared publicly
+                  </p>
+                </div>
+              </button>
+            </div>
+
+            {/* Collapsible content */}
+            {isPrivacyInfoExpanded && (
+              <div className="mt-4 border-t border-base-300 pt-4 space-y-4 bg-base-100 rounded-b-lg p-4 -mx-4 -mb-4">
+            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-3">
                 <h4 className="font-medium text-success">✅ Always Included</h4>
@@ -585,6 +583,8 @@ const PublicPage: React.FC = () => {
                 </div>
               </div>
             </div>
+              </div>
+            )}
           </div>
         </div>
       )}
diff --git a/frontend/src/pages/SettingsPage.tsx b/frontend/src/pages/SettingsPage.tsx
index ae0e3b4..929a474 100644
--- a/frontend/src/pages/SettingsPage.tsx
+++ b/frontend/src/pages/SettingsPage.tsx
@@ -155,7 +155,7 @@ const SettingsPage: React.FC = () => {
       <div className="h-full flex items-center justify-center">
         <div className="text-center">
           <div className="text-6xl mb-4">⚙️</div>
-          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
+          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
           <p className="text-base-content/60">Choose a project from the sidebar to view settings</p>
         </div>
       </div>
@@ -168,7 +168,7 @@ const SettingsPage: React.FC = () => {
   ];
 
   return (
-    <div className="space-y-4">
+    <div className="p-6 space-y-6">
       {error && (
         <div className="alert alert-error shadow-md">
           <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
@@ -180,11 +180,12 @@ const SettingsPage: React.FC = () => {
       )}
 
       {/* Project Information */}
-      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
-          <span className="text-xl">⚙️</span>
-          Project Information
-        </h2>
+      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
+        <input type="checkbox" defaultChecked />
+        <div className="collapse-title text-xl font-semibold bg-base-200 border-b border-base-content/10">
+        ⚙️ Project Information
+        </div>
+        <div className="collapse-content">
           {/* Basic Info Section */}
           <div className="pt-4">
             <div className="flex justify-between items-center mb-3">
@@ -506,26 +507,30 @@ const SettingsPage: React.FC = () => {
               </div>
             </div>
           </div>
+        </div>
       </div>
 
 
 
       {/* Export Data */}
-      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
-          <span className="text-xl">📤</span>
-          Export & Import Project Data
-        </h2>
-        <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
+      <div className="collapse collapse-arrow bg-base-200 shadow-lg border border-base-content/10">
+        <input type="checkbox" />
+        <div className="collapse-title text-xl font-medium">
+          📤 Export & Import Project Data
+        </div>
+        <div className="collapse-content">
+          <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
+        </div>
       </div>
 
       {/* Danger Zone */}
-      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-error">
-          <span className="text-xl">⚠️</span>
-          Danger Zone
-        </h2>
-        <div className="space-y-4">
+      <div className="collapse collapse-arrow bg-base-200 shadow-lg border border-base-content/10">
+        <input type="checkbox" />
+        <div className="collapse-title text-xl font-medium text-error">
+          ⚠️ Danger Zone
+        </div>
+        <div className="collapse-content">
+          <div className="space-y-4">
             <div className={`p-4 ${!selectedProject.isArchived ? 'bg-warning/10 border-warning/20' : 'bg-info/10 border-info/20'} rounded-lg border`}>
               <h4 className={`font-semibold ${!selectedProject.isArchived ? 'text-warning' : 'text-info'} mb-2`}>{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
               <p className={`${!selectedProject.isArchived ? 'text-warning/80' : 'text-info/80'} text-sm mb-4`}>
@@ -557,6 +562,7 @@ const SettingsPage: React.FC = () => {
                 Delete Project
               </button>
             </div>
+          </div>
         </div>
       </div>
 
diff --git a/frontend/src/pages/SharingPage.tsx b/frontend/src/pages/SharingPage.tsx
index cc8dfe8..632f3e6 100644
--- a/frontend/src/pages/SharingPage.tsx
+++ b/frontend/src/pages/SharingPage.tsx
@@ -48,7 +48,7 @@ const SharingPage: React.FC = () => {
       <div className="h-full flex items-center justify-center">
         <div className="text-center">
           <div className="text-6xl mb-4">👥</div>
-          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
+          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
           <p className="text-base-content/60">Choose a project from the sidebar to view sharing settings</p>
         </div>
       </div>
@@ -56,7 +56,7 @@ const SharingPage: React.FC = () => {
   }
 
   return (
-    <div className="space-y-4">
+    <div className="p-6 space-y-6">
       {error && (
         <div className="alert alert-error shadow-md">
           <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
@@ -68,11 +68,13 @@ const SharingPage: React.FC = () => {
       )}
 
       {/* Project Sharing */}
-      <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
-        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
-          <span className="text-xl">👥</span>
-          Project Sharing & Team Management
-        </h2>
+      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
+        <input type="checkbox" defaultChecked />
+        <div className="collapse-title text-xl font-semibold bg-base-200 border-b border-base-content/10">
+          👥 Project Sharing & Team Management
+        </div>
+        <div className="collapse-content">
+          <div className="pt-4">
             <div className="space-y-4">
               {/* Compact Sharing Status */}
               <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border">
@@ -135,19 +137,33 @@ const SharingPage: React.FC = () => {
               {/* Activity Log - Always show since activity is tracked regardless of sharing status */}
               {!selectedProject.isShared && (
                 <div className="mt-4">
-                  <div className="bg-base-100 rounded-lg border-subtle shadow-md p-4 mt-4">
-                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
-                      <span className="text-xl">📊</span>
-                      Activity Log
-                    </h3>
-                    <p className="text-sm text-base-content/60 mb-4">Your project activity is being tracked</p>
-                    <ActivityLog 
-                      projectId={selectedProject.id}
-                    />
+                  <div className="border border-base-300 rounded-lg bg-base-100">
+                    <div className="p-4 border-b border-base-300">
+                      <div className="flex items-center gap-3">
+                        <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center">
+                          <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
+                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2V5a2 2 0 00-2-2H9z" />
+                            <polyline points="9,11 12,14 22,4" />
+                          </svg>
+                        </div>
+                        <div>
+                          <h3 className="font-semibold text-base">Activity Log</h3>
+                          <p className="text-sm text-base-content/60">Your project activity is being tracked</p>
+                        </div>
+                      </div>
+                    </div>
+                    <div className="p-4">
+                      <ActivityLog 
+                        projectId={selectedProject.id}
+                        showControls={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
+                      />
+                    </div>
                   </div>
                 </div>
               )}
             </div>
+          </div>
+        </div>
       </div>
 
       <ConfirmationModal
