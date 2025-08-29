import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const BillingSuccessPage = lazy(() => import('./pages/BillingSuccessPage'));
const BillingCancelPage = lazy(() => import('./pages/BillingCancelPage'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const StackPage = lazy(() => import('./pages/StackPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const DeploymentPage = lazy(() => import('./pages/DeploymentPage'));
const PublicPage = lazy(() => import('./pages/PublicPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const PublicProjectPage = lazy(() => import('./pages/PublicProjectPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));

// Import debug utils in development
if (import.meta.env.DEV) {
  import('./utils/debugUtils');
}

const queryClient = new QueryClient();

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="loading loading-spinner loading-lg"></div>
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    // Apply saved theme on app load
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Cleanup function for when the app unmounts
    return () => {
      // Clean up services to prevent memory leaks
      if (typeof window !== 'undefined') {
        // Cleanup notification service
        import('./services/notificationService').then(({ notificationService }) => {
          notificationService.cleanup();
        });
        
        // Cleanup lock signaling service
        import('./services/lockSignaling').then(({ lockSignaling }) => {
          lockSignaling.cleanup();
        });
        
        // Cleanup analytics service
        import('./services/analytics').then(({ analyticsService }) => {
          if (analyticsService && typeof analyticsService.endSession === 'function') {
            analyticsService.endSession();
          }
        });
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/billing/cancel" element={<BillingCancelPage />} />
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/notes?view=projects" />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="stack" element={<StackPage />} />
              <Route path="docs" element={<DocsPage />} />
              <Route path="deployment" element={<DeploymentPage />} />
              <Route path="public" element={<PublicPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="discover/project/:identifier" element={<PublicProjectPage />} />
              <Route path="discover/user/:identifier" element={<PublicProfilePage />} />
              <Route path="project/:identifier" element={<PublicProjectPage />} />
              <Route path="user/:identifier" element={<PublicProfilePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="account-settings" element={<AccountSettingsPage />} />
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;