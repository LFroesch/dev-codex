import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BillingPage from './pages/BillingPage';
import BillingSuccessPage from './pages/BillingSuccessPage';
import BillingCancelPage from './pages/BillingCancelPage';
import Layout from './components/Layout';
import CreateProject from './pages/CreateProject';
import NotesPage from './pages/NotesPage';
import RoadmapPage from './pages/RoadmapPage';
import DocsPage from './pages/DocsPage';
import DeploymentPage from './pages/DeploymentPage';
import PublicPage from './pages/PublicPage';
import SettingsPage from './pages/SettingsPage';
import DiscoverPage from './pages/DiscoverPage';
import IdeasPage from './pages/IdeasPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SupportPage from './pages/SupportPage';
import PublicProjectPage from './pages/PublicProjectPage';
import PublicProfilePage from './pages/PublicProfilePage';

// Import debug utils in development
if (import.meta.env.DEV) {
  import('./utils/debugUtils');
}

const queryClient = new QueryClient();

const App: React.FC = () => {
  useEffect(() => {
    // Apply saved theme on app load
    const savedTheme = localStorage.getItem('theme') || 'cyberpunk';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />
          <Route path="/create-project" element={<CreateProject />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/notes" />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="deployment" element={<DeploymentPage />} />
            <Route path="public" element={<PublicPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="discover/project/:identifier" element={<PublicProjectPage />} />
            <Route path="discover/user/:identifier" element={<PublicProfilePage />} />
            <Route path="project/:identifier" element={<PublicProjectPage />} />
            <Route path="user/:identifier" element={<PublicProfilePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="account-settings" element={<AccountSettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;