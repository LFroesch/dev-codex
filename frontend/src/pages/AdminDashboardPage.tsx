import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { analyticsAPI, newsAPI } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';
import { AnalyticsTab, UsersTab, AdminActivityFeed } from '../components/admin';
import TicketKanban from '../components/TicketKanban';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { csrfFetch } from '../utils/csrf';
import { toast } from '../services/toast';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  planTier: 'free' | 'pro' | 'premium';
  subscriptionStatus?: string;
  isAdmin: boolean;
  isBanned?: boolean;
  bannedAt?: string;
  banReason?: string;
  bannedBy?: string;
  createdAt: string;
  projectCount?: number;
}

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  activeSubscriptions: number;
  recentSignups: number;
  planDistribution: {
    free: number;
    pro: number;
    premium: number;
  };
}

interface Ticket {
  _id: string;
  ticketId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    planTier: string;
  };
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface NewsPost {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished: boolean;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ activeAdminTab?: 'users' | 'tickets' | 'analytics' | 'news' | 'activity' }>();
  const activeTab = context?.activeAdminTab || 'users';
  const [ticketStatusTab, setTicketStatusTab] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('open');
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClosedTickets, setLoadingClosedTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [respondingToTicket, setRespondingToTicket] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnalyticsResetConfirm, setShowAnalyticsResetConfirm] = useState(false);
  const [resettingAnalytics, setResettingAnalytics] = useState(false);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState<string>('');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    summary: '',
    type: 'news' as 'news' | 'update' | 'dev_log' | 'announcement' | 'important',
    isPublished: false
  });
  const [postToDelete, setPostToDelete] = useState<NewsPost | null>(null);

  // Ban/Unban state
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);

  // Refund state
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [userToRefund, setUserToRefund] = useState<User | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchUsers = async (pageNum: number = 1) => {
    try {
      const response = await fetch(`/api/admin/users?page=${pageNum}&limit=10`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      // Fetch tickets excluding closed ones (they're loaded on demand)
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        excludeStatus: 'closed'
      });

      const response = await fetch(`/api/admin/tickets?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets);
      setTicketStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchClosedTickets = async () => {
    try {
      setLoadingClosedTickets(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        status: 'closed'
      });

      const response = await fetch(`/api/admin/tickets?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch closed tickets');
      }

      const data = await response.json();
      setClosedTickets(data.tickets);
    } catch (err: any) {
      toast.error('Failed to load closed tickets: ' + err.message);
    } finally {
      setLoadingClosedTickets(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planTier: newPlan })
      });

      if (!response.ok) {
        throw new Error('Failed to update user plan');
      }

      // Refresh users list
      await fetchUsers(page);
      await fetchStats();
    } catch (err: any) {
      alert('Failed to update user plan: ' + err.message);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const userData = await response.json();
      setSelectedUser(userData);
    } catch (err: any) {
      alert('Failed to fetch user details: ' + err.message);
    }
  };

  const fetchUserProjects = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/projects`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user projects');
      }

      const data = await response.json();
      setUserProjects(data.projects);
      setSelectedUserForProjects(userName);
      setShowProjectsModal(true);
    } catch (err: any) {
      alert('Failed to fetch user projects: ' + err.message);
    }
  };

  const toggleProjectLock = async (projectId: string, lock: boolean, reason?: string) => {
    try {
      const response = await csrfFetch(`/api/admin/projects/${projectId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to update project lock');
      }

      // Update the project in the local state immediately
      setUserProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId
            ? { ...project, isLocked: lock, lockedReason: reason }
            : project
        )
      );

      toast.success(`Project ${lock ? 'locked' : 'unlocked'} successfully!`);

      // Also refresh from server to ensure sync
      if (showProjectsModal && selectedUserForProjects) {
        const userId = userProjects[0]?.userId || userProjects[0]?.ownerId;
        if (userId) {
          await fetchUserProjects(userId, selectedUserForProjects);
        }
      }
    } catch (err: any) {
      toast.error('Failed to update project lock: ' + err.message);
    }
  };

  const sendPasswordReset = async (userId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/password-reset`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to send password reset');
      }

      alert('Password reset email sent successfully!');
    } catch (err: any) {
      alert('Failed to send password reset email: ' + err.message);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Refresh users list and clear selections
      await fetchUsers(page);
      await fetchStats();
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setSelectedUser(null);
      alert('User deleted successfully!');
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const updateTicket = async (ticketId: string, status?: string, adminResponse?: string, priority?: string) => {
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status, adminResponse, priority })
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }

      // Refresh tickets list
      await fetchTickets();
      setSelectedTicket(null);
      setAdminResponse('');
      setRespondingToTicket(null);

      if (adminResponse) {
        toast.success('Response sent successfully!');
      } else if (status) {
        toast.success('Ticket status updated!');
      }
    } catch (err: any) {
      toast.error('Failed to update ticket: ' + err.message);
    }
  };

  const handleQuickReply = async (ticketId: string, response: string) => {
    try {
      await updateTicket(ticketId, undefined, response);
    } catch (err: any) {
      toast.error('Failed to send reply: ' + err.message);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      await updateTicket(ticketId, newStatus);

      // If moving a ticket to closed status, remove it from main list and add to closed
      if (newStatus === 'closed') {
        const closedTicket = tickets.find(t => t.ticketId === ticketId);
        if (closedTicket && closedTickets.length > 0) {
          // If closed tickets are loaded, add this ticket to the list
          setClosedTickets([closedTicket, ...closedTickets]);
        }
      }
      // If moving a ticket from closed to another status, refresh the main list
      else if (closedTickets.find(t => t.ticketId === ticketId)) {
        await fetchTickets();
        // Remove from closed list if it was there
        setClosedTickets(closedTickets.filter(t => t.ticketId !== ticketId));
      }
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const resetAnalytics = async () => {
    try {
      setResettingAnalytics(true);
      const result = await analyticsAPI.resetAllAnalytics() as any;
      const deletedAnalytics = result?.deletedAnalytics ?? 0;
      const deletedSessions = result?.deletedSessions ?? 0;
      alert(`Analytics reset successful! Deleted ${deletedAnalytics} analytics events, ${deletedSessions} sessions, and cleared all project time data.`);
      setShowAnalyticsResetConfirm(false);
    } catch (err: any) {
      alert('Failed to reset analytics: ' + (err.response?.data?.error || err.message));
    } finally {
      setResettingAnalytics(false);
    }
  };

  const banUser = async (userId: string, reason: string) => {
    try {
      setBanLoading(true);
      const response = await csrfFetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to ban user');
      }

      await fetchUsers(page);
      await fetchStats();
      setShowBanConfirm(false);
      setUserToBan(null);
      setBanReason('');
      setSelectedUser(null);
      alert('User banned successfully!');
    } catch (err: any) {
      alert('Failed to ban user: ' + err.message);
    } finally {
      setBanLoading(false);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unban user');
      }

      await fetchUsers(page);
      await fetchStats();
      setSelectedUser(null);
      alert('User unbanned successfully!');
    } catch (err: any) {
      alert('Failed to unban user: ' + err.message);
    }
  };

  const processRefund = async (userId: string, reason?: string) => {
    try {
      setRefundLoading(true);
      const response = await csrfFetch(`/api/admin/users/${userId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      await fetchUsers(page);
      await fetchStats();
      setShowRefundConfirm(false);
      setUserToRefund(null);
      setRefundReason('');
      setSelectedUser(null);
      alert('Refund processed successfully!');
    } catch (err: any) {
      alert('Failed to process refund: ' + err.message);
    } finally {
      setRefundLoading(false);
    }
  };

  const fetchNewsPosts = async () => {
    try {
      const response = await newsAPI.getAll();
      setNewsPosts(response.posts);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPost) {
        await newsAPI.update(editingPost._id, newsForm);
      } else {
        await newsAPI.create(newsForm);
      }
      
      await fetchNewsPosts();
      setShowNewsForm(false);
      setEditingPost(null);
      setNewsForm({
        title: '',
        content: '',
        summary: '',
        type: 'news',
        isPublished: false
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditPost = (post: NewsPost) => {
    setEditingPost(post);
    setNewsForm({
      title: post.title,
      content: post.content,
      summary: post.summary || '',
      type: post.type,
      isPublished: post.isPublished
    });
    setShowNewsForm(true);
  };

  const handleDeletePost = (post: NewsPost) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    
    try {
      await newsAPI.delete(postToDelete._id);
      await fetchNewsPosts();
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTogglePublish = async (post: NewsPost) => {
    try {
      await newsAPI.update(post._id, { isPublished: !post.isPublished });
      await fetchNewsPosts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Enhanced markdown to HTML converter (same as EnhancedTextEditor)
  const renderMarkdown = (text: string, isPreview = false): string => {
    if (!text) return '<p class="text-base-content/60 italic">Nothing to preview yet...</p>';
    
    let processedText = text;
    
    // Helper function to ensure URL has protocol
    const ensureProtocol = (url: string): string => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return 'https://' + url;
    };
    
    // Process in order to avoid conflicts
    
    // 1. Headers - remove top margin for previews
    const headerMargin = isPreview ? 'mt-1' : 'mt-4';
    processedText = processedText
      .replace(/^### (.*$)/gim, `<h3 class="text-lg font-semibold ${headerMargin} mb-2">$1</h3>`)
      .replace(/^## (.*$)/gim, `<h2 class="text-xl font-semibold ${headerMargin} mb-2">$1</h2>`)
      .replace(/^# (.*$)/gim, `<h1 class="text-2xl font-bold ${headerMargin} mb-2">$1</h1>`);
    
    // 2. Code blocks (must come before inline code and links)
    processedText = processedText
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 3. Markdown-style links [text](url) - process before auto-linking
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_, text, url) => {
      const fullUrl = ensureProtocol(url);
      return `<a href="${fullUrl}" class="link link-primary" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // 4. Auto-detect plain URLs
    const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<>"']+)/gi;
    processedText = processedText.replace(urlRegex, '<a href="$1" class="link link-primary" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 5. Bold and italic (must come after links to avoid conflicts)
    processedText = processedText
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em class="font-bold italic">$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/gim, '<em class="italic">$1</em>');
    
    // 6. Lists
    processedText = processedText
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');
    
    // 7. Line breaks and paragraphs
    processedText = processedText
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');
    
    // 8. Wrap in paragraph tags if not already wrapped
    if (!processedText.includes('<p') && !processedText.includes('<h') && !processedText.includes('<pre')) {
      processedText = `<p class="mb-2">${processedText}</p>`;
    }

    return processedText;
  };

  // Handle escape key for projects modal
  useEffect(() => {
    if (!showProjectsModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProjectsModal(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showProjectsModal]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        if (activeTab === 'users') {
          await Promise.all([fetchUsers(1), fetchStats()]);
        } else if (activeTab === 'news') {
          await fetchNewsPosts();
        } else {
          await fetchTickets(1);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [activeTab, ticketStatusTab]);




  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="card w-96 bg-base-100 shadow-lg border-subtle rounded-lg">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-error">Access Denied</h2>
            <p>{error}</p>
            <div className="card-actions">
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'badge-ghost';
      case 'pro': return 'badge-primary';
      case 'premium': return 'badge-secondary';
      default: return 'badge-neutral';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'badge-error';
      case 'in_progress': return 'badge-warning';
      case 'resolved': return 'badge-success';
      case 'closed': return 'badge-neutral';
      default: return 'badge-ghost';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'badge-info';
      case 'medium': return 'badge-warning';
      case 'high': return 'badge-error';
      case 'urgent': return 'badge-error badge-outline';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="p-1">

        {/* Stats Cards */}
        {activeTab === 'users' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Total Users</div>
              <div className="stat-value text-2xl sm:text-3xl text-primary">{stats.totalUsers}</div>
              <div className="stat-desc text-xs">↗︎ {stats.recentSignups} new this month</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Total Projects</div>
              <div className="stat-value text-2xl sm:text-3xl text-secondary">{stats.totalProjects}</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Active Subscriptions</div>
              <div className="stat-value text-2xl sm:text-3xl text-accent">{stats.activeSubscriptions}</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Plan Distribution</div>
              <div className="stat-value text-xs sm:text-sm">
                <div>Free: {stats.planDistribution.free}</div>
                <div>Pro: {stats.planDistribution.pro}</div>
                <div>Premium: {stats.planDistribution.premium}</div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Stats Cards */}
        {activeTab === 'tickets' && ticketStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Open Tickets</div>
              <div className="stat-value text-2xl sm:text-3xl text-error">{ticketStats.open}</div>
              <div className="stat-desc text-xs hidden sm:block">Require attention</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">In Progress</div>
              <div className="stat-value text-2xl sm:text-3xl text-warning">{ticketStats.inProgress}</div>
              <div className="stat-desc text-xs hidden sm:block">Being worked on</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Resolved</div>
              <div className="stat-value text-2xl sm:text-3xl text-success">{ticketStats.resolved}</div>
              <div className="stat-desc text-xs hidden sm:block">Awaiting closure</div>
            </div>

            <div className="stat bg-base-100 rounded-lg shadow-md border-2 border-base-content/20 py-4">
              <div className="stat-title text-xs sm:text-sm">Closed</div>
              <div className="stat-value text-2xl sm:text-3xl text-neutral">{ticketStats.closed}</div>
              <div className="stat-desc text-xs hidden sm:block">Completed tickets</div>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="shadow-md p-1 rounded-lg border-2 border-base-content/20 transition-all duration-200" style={{ overflow: 'visible' }}>
            <div className="card-body" style={{ overflow: 'visible' }}>
            <div className="flex-between-center mb-4">
              <h2 className="card-title">Users</h2>
              <div className="badge badge-neutral h-6 px-3 py-1 font-bold text-sm">{users.length} of {stats?.totalUsers} total</div>
            </div>

            <div className="overflow-x-auto" style={{ paddingBottom: '200px' }}>
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Projects</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Admin</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="font-semibold">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <div className="dropdown dropdown-end">
                          <div
                            tabIndex={0}
                            role="button"
                            className={`badge ${getPlanBadgeColor(user.planTier)} h-6 px-3 py-1 font-bold text-sm cursor-pointer`}
                          >
                            {user.planTier}
                          </div>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32" style={{ zIndex: 9999 }}>
                            <li><a onClick={() => updateUserPlan(user._id, 'free')}>Free</a></li>
                            <li><a onClick={() => updateUserPlan(user._id, 'pro')}>Pro</a></li>
                            <li><a onClick={() => updateUserPlan(user._id, 'premium')}>Premium</a></li>
                          </ul>
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="font-semibold">{user.projectCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`badge ${user.subscriptionStatus === 'active' ? 'badge-success' : 'badge-ghost'} h-6 px-3 py-1 font-bold text-sm`}>
                          {user.subscriptionStatus || 'inactive'}
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {user.isAdmin && <div className="badge badge-warning h-6 px-3 py-1 font-bold text-sm">Admin</div>}
                          {user.isBanned && <div className="badge badge-error h-6 px-3 py-1 font-bold text-sm">Banned</div>}
                        </div>
                      </td>
                      <td>
                        <div className="dropdown dropdown-end">
                          <div 
                            tabIndex={0}
                            role="button" 
                            className="btn-ghost-xs"
                          >
                            ⋮
                          </div>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48" style={{ zIndex: 9999 }}>
                            <li>
                              <a onClick={() => fetchUserDetails(user._id)}>
                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </a>
                            </li>
                            <li>
                              <a onClick={() => fetchUserProjects(user._id, user.firstName + ' ' + user.lastName)}>
                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                Manage Projects
                              </a>
                            </li>
                            <li>
                              <a onClick={() => sendPasswordReset(user._id)} className="text-warning">
                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Send Password Reset
                              </a>
                            </li>
                            <li>
                              <a
                                className="text-info"
                                onClick={() => {
                                  setUserToRefund(user);
                                  setRefundReason('');
                                  setShowRefundConfirm(true);
                                }}
                              >
                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Process Refund
                              </a>
                            </li>
                            <div className="divider my-1"></div>
                            {!user.isBanned ? (
                              <li>
                                <a
                                  className="text-error"
                                  onClick={() => {
                                    setUserToBan(user);
                                    setBanReason('');
                                    setShowBanConfirm(true);
                                  }}
                                >
                                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  Ban User
                                </a>
                              </li>
                            ) : (
                              <li>
                                <a
                                  className="text-success"
                                  onClick={() => unbanUser(user._id)}
                                >
                                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Unban User
                                </a>
                              </li>
                            )}
                            <li>
                              <a
                                className="text-error"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete User
                              </a>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="join">
                  <button 
                    className="join-item btn"
                    disabled={page <= 1}
                    onClick={() => fetchUsers(page - 1)}
                  >
                    «
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`join-item btn ${pageNum === page ? 'btn-active' : ''}`}
                      onClick={() => fetchUsers(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button 
                    className="join-item btn"
                    disabled={page >= totalPages}
                    onClick={() => fetchUsers(page + 1)}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Tickets Kanban Board */}
        {activeTab === 'tickets' && (
          <div className="p-4">
            {/* Kanban Board */}
            <TicketKanban
              tickets={tickets}
              ticketStats={ticketStats}
              onStatusChange={handleStatusChange}
              onQuickReply={handleQuickReply}
              onViewFull={setSelectedTicket}
              onLoadClosedTickets={fetchClosedTickets}
              closedTickets={closedTickets}
              loadingClosedTickets={loadingClosedTickets}
            />

              {/* Ticket Details Modal */}
              {selectedTicket && (
                <div className="mt-6 p-4 bg-primary/5 shadow-xl border-2 border-primary rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ticket Details
                    </h3>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="btn btn-sm btn-circle btn-ghost"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="bg-base-100 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider">Ticket ID</span>
                        <div className="font-mono font-semibold">{selectedTicket.ticketId}</div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider">User</span>
                        <div className="font-semibold">
                          {selectedTicket.userId.firstName} {selectedTicket.userId.lastName}
                        </div>
                        <div className="text-sm text-base-content/60">{selectedTicket.userId.email}</div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider block mb-1">Category</span>
                        <div className="badge badge-outline h-6 px-3 py-1 font-bold text-sm">{selectedTicket.category.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider block mb-1">Priority</span>
                        <div className={`badge ${getPriorityBadgeColor(selectedTicket.priority)} h-6 px-3 py-1 font-bold text-sm`}>
                          {selectedTicket.priority}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider block mb-1">Status</span>
                        <div className={`badge ${getStatusBadgeColor(selectedTicket.status)} h-6 px-3 py-1 font-bold text-sm`}>
                          {getStatusDisplayText(selectedTicket.status)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-base-content/60 uppercase tracking-wider">Created</span>
                        <div className="text-sm">{formatDate(selectedTicket.createdAt)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs text-base-content/60 uppercase tracking-wider">Message</span>
                    <div className="bg-base-100 p-4 rounded-lg mt-2 whitespace-pre-wrap border-l-4 border-primary">
                      {selectedTicket.message}
                    </div>
                  </div>

                  {selectedTicket.adminResponse && (
                    <div className="mb-4">
                      <span className="text-xs text-base-content/60 uppercase tracking-wider">Admin Response</span>
                      <div className="bg-success/10 p-4 rounded-lg mt-2 whitespace-pre-wrap border-l-4 border-success">
                        {selectedTicket.adminResponse}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setRespondingToTicket(selectedTicket.ticketId);
                        setAdminResponse('');
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Response
                    </button>
                    {selectedTicket.status === 'open' && (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => updateTicket(selectedTicket.ticketId, 'in_progress')}
                      >
                        Start Working
                      </button>
                    )}
                    {selectedTicket.status === 'in_progress' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => updateTicket(selectedTicket.ticketId, 'resolved')}
                      >
                        Mark Resolved
                      </button>
                    )}
                    {selectedTicket.status === 'resolved' && (
                      <button
                        className="btn btn-neutral btn-sm"
                        onClick={() => updateTicket(selectedTicket.ticketId, 'closed')}
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Response Form */}
              {respondingToTicket && (
                <div className="mt-6 p-3 sm:p-4 bg-warning/10 shadow-md border-2 border-base-content/20 rounded-lg">
                  <h3 className="font-bold text-base sm:text-lg mb-4">Respond to Ticket: {respondingToTicket}</h3>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-semibold text-sm sm:text-base">Response</span>
                    </label>
                    <textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="textarea textarea-bordered h-24 w-full text-sm sm:text-base"
                      maxLength={2000}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50 text-xs">
                        {adminResponse.length}/2000 characters
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn btn-primary btn-sm sm:btn-md"
                      onClick={() => updateTicket(respondingToTicket, undefined, adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      <span className="hidden sm:inline">Send Response</span>
                      <span className="sm:hidden">Send</span>
                    </button>
                    <button
                      className="btn btn-warning btn-sm sm:btn-md"
                      onClick={() => updateTicket(respondingToTicket, 'in_progress', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      <span className="hidden sm:inline">Send & Mark In Progress</span>
                      <span className="sm:hidden">In Progress</span>
                    </button>
                    <button
                      className="btn btn-success btn-sm sm:btn-md"
                      onClick={() => updateTicket(respondingToTicket, 'resolved', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      <span className="hidden sm:inline">Send & Mark Resolved</span>
                      <span className="sm:hidden">Resolved</span>
                    </button>
                    <button
                      className="btn btn-neutral btn-sm sm:btn-md"
                      onClick={() => updateTicket(respondingToTicket, 'closed', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      <span className="hidden sm:inline">Send & Close</span>
                      <span className="sm:hidden">Close</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm sm:btn-md"
                      onClick={() => {
                        setRespondingToTicket(null);
                        setAdminResponse('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <AdminActivityFeed />
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <div className="space-y-6 p-4">
            {/* Header with Create Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">News & Updates Management</h2>
              <button
                className="btn btn-primary border-thick"
                onClick={() => {
                  setEditingPost(null);
                  setNewsForm({
                    title: '',
                    content: '',
                    summary: '',
                    type: 'news',
                    isPublished: false
                  });
                  setShowNewsForm(true);
                }}
                style={{color:getContrastTextColor("primary")}}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Post
              </button>
            </div>

            {/* Compact Create News Form */}
            <div className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200">
              {!showNewsForm ? (
                <button
                  onClick={() => setShowNewsForm(true)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
                >
                  <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span className="text-base-content/60">Create a new post...</span>
                </button>
              ) : (
                <form onSubmit={handleNewsSubmit} className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm text-base-content/70">
                      {editingPost ? 'Edit Post' : 'New Post'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewsForm(false);
                        setEditingPost(null);
                        setNewsForm({
                          title: '',
                          content: '',
                          summary: '',
                          type: 'news',
                          isPublished: false
                        });
                      }}
                      className="text-base-content/40 hover:text-base-content/60 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newsForm.title}
                      onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                      className="input input-bordered input-sm text-base-content/40 w-full"
                      placeholder="Post title..."
                      required
                      autoFocus
                    />
                    
                    <select
                      className="select select-bordered select-sm w-full"
                      value={newsForm.type}
                      onChange={(e) => setNewsForm(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="news">📰 News</option>
                      <option value="update">🔄 Update</option>
                      <option value="dev_log">👩‍💻 Dev Log</option>
                      <option value="announcement">📢 Announcement</option>
                      <option value="important">⚠️ Important</option>
                    </select>
                  </div>
                  
                  <textarea
                    value={newsForm.summary}
                    onChange={(e) => setNewsForm(prev => ({ ...prev, summary: e.target.value }))}
                    className="textarea textarea-bordered textarea-sm w-full"
                    placeholder="Brief summary (optional)..."
                    rows={2}
                  />
                  
                  <textarea
                    value={newsForm.content}
                    onChange={(e) => setNewsForm(prev => ({ ...prev, content: e.target.value }))}
                    className="textarea textarea-bordered textarea-sm w-full"
                    placeholder="Write your post content..."
                    rows={4}
                    required
                  />
                  
                  <div className="flex items-center gap-2 pt-2">
                    <label className="cursor-pointer label gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={newsForm.isPublished}
                        onChange={(e) => setNewsForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                        style={{color:getContrastTextColor("primary")}}
                      />
                      <span className="label-text text-sm">Publish immediately</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{color:getContrastTextColor("primary")}}
                    >
                      {editingPost ? 'Update' : 'Create Post'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewsForm(false);
                        setEditingPost(null);
                        setNewsForm({
                          title: '',
                          content: '',
                          summary: '',
                          type: 'news',
                          isPublished: false
                        });
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {newsPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 text-base-content/80">No posts yet</h3>
                <p className="text-sm text-base-content/60">Create your first news post to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {newsPosts.map((post) => (
                  <div key={post._id} className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 h-48 flex flex-col">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="border-2 border-base-content/20 font-semibold truncate px-2 py-1 rounded-md group-hover:opacity-90 transition-opacity bg-primary"
                           style={{ color: getContrastTextColor() }}>
                          {post.type === 'news' ? '📰' : post.type === 'update' ? '🔄' : post.type === 'dev_log' ? '👩‍💻' : post.type === 'important' ? '⚠️' : '📢'} {post.title}
                        </h3>
                        <span className={`badge ${post.isPublished ? 'badge-success' : 'badge-ghost'} h-5 px-2 py-0.5 font-bold text-xs`}>
                          {post.isPublished ? '✓' : '○'}
                        </span>
                      </div>
                      
                      {post.summary && (
                        <p className="text-sm text-base-content/60 mb-2 line-clamp-1">
                          {post.summary}
                        </p>
                      )}
                      
                      <div 
                        className="text-sm text-base-content/70 mb-3 line-clamp-3 flex-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content.substring(0, 150) + '...', true) }}
                      />
                      
                      <div className="flex items-center justify-between text-xs text-base-content/50 pt-3 mt-auto border-t border-base-200">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <button
                            className={`btn btn-xs ${post.isPublished ? 'btn-warning' : 'btn-success'}`}
                            onClick={() => handleTogglePublish(post)}
                            title={post.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {post.isPublished ? '👁️‍🗨️' : '👁️'}
                          </button>
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleEditPost(post)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-xs btn-error btn-outline"
                            onClick={() => handleDeletePost(post)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex-between-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">User Details</h2>
                <button
                  className="btn-ghost-sm"
                  onClick={() => setSelectedUser(null)}
                >
                  <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-base-content/70">Name</label>
                    <p className="text-lg">{selectedUser.firstName} {selectedUser.lastName}</p>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70">Email</label>
                    <p className="text-lg">{selectedUser.email}</p>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70 mr-2">Plan</label>
                    <div className={`badge ${getPlanBadgeColor(selectedUser.planTier)} h-7 px-4 py-1 font-bold text-base`}>
                      {selectedUser.planTier}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-base-content/70 mr-2">Status</label>
                    <div className={`badge ${selectedUser.subscriptionStatus === 'active' ? 'badge-success' : 'badge-ghost'} h-7 px-4 py-1 font-bold text-base`}>
                      {selectedUser.subscriptionStatus || 'inactive'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-base-content/70">Project Count</label>
                    <p className="text-lg">{selectedUser.projectCount || 0} projects</p>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70">Account Created</label>
                    <p className="text-lg">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70 mr-2">Admin Status</label>
                    <div className={`badge ${selectedUser.isAdmin ? 'badge-warning' : 'badge-neutral'} h-7 px-4 py-1 font-bold text-base`}>
                      {selectedUser.isAdmin ? 'Admin' : 'Regular User'}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-base-content/70">User ID</label>
                    <p className="text-sm font-mono bg-base-200 p-2 rounded">{selectedUser._id}</p>
                  </div>
                </div>
              </div>

              {/* Ban Status Section */}
              {selectedUser.isBanned && (
                <div className="mt-4 p-3 sm:p-4 bg-error/10 border-2 border-error/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="icon-sm text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="font-semibold text-error">User is Banned</span>
                  </div>
                  {selectedUser.banReason && (
                    <p className="text-sm text-base-content/70 mb-2">
                      <strong>Reason:</strong> {selectedUser.banReason}
                    </p>
                  )}
                  {selectedUser.bannedAt && (
                    <p className="text-xs text-base-content/60">
                      Banned on {formatDate(selectedUser.bannedAt)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8 flex-wrap">
                <button
                  className="btn btn-warning btn-sm sm:btn-md"
                  onClick={() => {
                    sendPasswordReset(selectedUser._id);
                    setSelectedUser(null);
                  }}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="hidden sm:inline">Send Password Reset</span>
                  <span className="sm:hidden">Password Reset</span>
                </button>
                <button
                  className="btn btn-info btn-sm sm:btn-md"
                  onClick={() => {
                    setUserToRefund(selectedUser);
                    setRefundReason('');
                    setShowRefundConfirm(true);
                    setSelectedUser(null);
                  }}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Process Refund</span>
                  <span className="sm:hidden">Refund</span>
                </button>
                {!selectedUser.isBanned ? (
                  <button
                    className="btn btn-error btn-outline btn-sm sm:btn-md"
                    onClick={() => {
                      setUserToBan(selectedUser);
                      setBanReason('');
                      setShowBanConfirm(true);
                      setSelectedUser(null);
                    }}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span className="hidden sm:inline">Ban User</span>
                    <span className="sm:hidden">Ban</span>
                  </button>
                ) : (
                  <button
                    className="btn btn-success btn-sm sm:btn-md"
                    onClick={() => {
                      unbanUser(selectedUser._id);
                    }}
                  >
                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Unban User</span>
                    <span className="sm:hidden">Unban</span>
                  </button>
                )}
                <button
                  className="btn btn-error btn-sm sm:btn-md"
                  onClick={() => {
                    setUserToDelete(selectedUser);
                    setShowDeleteConfirm(true);
                    setSelectedUser(null);
                  }}
                >
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showDeleteConfirm && !!userToDelete}
          onConfirm={() => deleteUser(userToDelete?._id!)}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
          title="Delete User Account"
          message={`Are you sure you want to delete <strong>${userToDelete?.firstName} ${userToDelete?.lastName}</strong>?<br/><br/>
            <div style="background: rgb(248 113 113 / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
              <p style="color: rgb(248 113 113); font-weight: 600; margin-bottom: 0.5rem;">⚠️ This action cannot be undone!</p>
              <ul style="color: rgb(138 138 138); font-size: 0.875rem; margin: 0; padding-left: 1rem;">
                <li>• User account will be permanently deleted</li>
                <li>• All user projects will be deleted</li>
                <li>• User data cannot be recovered</li>
              </ul>
            </div>`}
          confirmText="Delete User"
          variant="error"
        />

        <ConfirmationModal
          isOpen={showAnalyticsResetConfirm}
          onConfirm={resetAnalytics}
          onCancel={() => setShowAnalyticsResetConfirm(false)}
          title="Reset Analytics Data"
          message={`Are you sure you want to reset all analytics data? This will clear all session tracking, user activity data, and project time tracking.<br/><br/>
            <div style="background: rgb(248 113 113 / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
              <p style="color: rgb(248 113 113); font-weight: 600; margin-bottom: 0.5rem;">⚠️ This action cannot be undone!</p>
              <ul style="color: rgb(138 138 138); font-size: 0.875rem; margin: 0; padding-left: 1rem;">
                <li>• All analytics events will be deleted</li>
                <li>• All user session data will be cleared</li>
                <li>• All project time tracking data will be deleted</li>
                <li>• Historical usage data will be lost</li>
                <li>• This is useful for dev/testing environments</li>
              </ul>
            </div>`}
          confirmText={resettingAnalytics ? "Resetting..." : "Reset Analytics"}
          variant="error"
        />

        <ConfirmationModal
          isOpen={showDeleteConfirm && !!postToDelete}
          onConfirm={confirmDeletePost}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setPostToDelete(null);
          }}
          title="Delete News Post"
          message={`Are you sure you want to delete the post <strong>"${postToDelete?.title}"</strong>?<br/><br/>
            <div style="background: rgb(248 113 113 / 0.1); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
              <p style="color: rgb(248 113 113); font-weight: 600; margin-bottom: 0.5rem;">⚠️ This action cannot be undone!</p>
              <ul style="color: rgb(138 138 138); font-size: 0.875rem; margin: 0; padding-left: 1rem;">
                <li>• The post will be permanently deleted</li>
                <li>• It will be removed from the public news page</li>
                <li>• Post content cannot be recovered</li>
              </ul>
            </div>`}
          confirmText="Delete Post"
          variant="error"
        />

        {/* Ban User Modal */}
        {showBanConfirm && userToBan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Ban User</h2>

              <div className="mb-4">
                <p className="text-base-content/80 mb-2">
                  You are about to ban <strong>{userToBan.firstName} {userToBan.lastName}</strong>
                </p>
                <div className="bg-error/10 border-2 border-error/20 p-3 rounded-lg">
                  <p className="text-error font-semibold mb-1">Warning</p>
                  <ul className="text-sm text-base-content/70 list-disc list-inside">
                    <li>User will be immediately logged out</li>
                    <li>User will not be able to access their account</li>
                    <li>User can be unbanned by admins</li>
                  </ul>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Ban Reason (Required)</span>
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  className="btn btn-error btn-sm sm:btn-md flex-1"
                  onClick={() => banUser(userToBan._id, banReason)}
                  disabled={!banReason.trim() || banLoading}
                >
                  {banLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Banning...
                    </>
                  ) : (
                    'Ban User'
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm sm:btn-md flex-1"
                  onClick={() => {
                    setShowBanConfirm(false);
                    setUserToBan(null);
                    setBanReason('');
                  }}
                  disabled={banLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundConfirm && userToRefund && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Process Refund</h2>

              <div className="mb-4">
                <p className="text-base-content/80 mb-3">
                  You are about to process a refund for <strong>{userToRefund.firstName} {userToRefund.lastName}</strong>
                </p>

                <div className="bg-base-200 p-3 rounded-lg mb-3">
                  <p className="text-sm font-semibold mb-1">User Information</p>
                  <p className="text-sm text-base-content/70">
                    <strong className="mr-2">Plan:</strong>
                    <span className={`badge ${getPlanBadgeColor(userToRefund.planTier)} h-5 px-2 py-0.5 font-bold text-xs`}>
                      {userToRefund.planTier}
                    </span>
                  </p>
                  <p className="text-sm text-base-content/70">
                    <strong>Email:</strong> {userToRefund.email}
                  </p>
                </div>

                <div className="bg-warning/10 border-2 border-warning/20 p-3 rounded-lg">
                  <p className="text-warning font-semibold mb-1">Important</p>
                  <ul className="text-sm text-base-content/70 list-disc list-inside">
                    <li>This will process a refund through Stripe</li>
                    <li>User's subscription will be cancelled</li>
                    <li>User will be downgraded to Free plan</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Refund Reason (Optional)</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund (optional)..."
                  className="textarea textarea-bordered w-full"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  className="btn btn-info btn-sm sm:btn-md flex-1"
                  onClick={() => processRefund(userToRefund._id, refundReason)}
                  disabled={refundLoading}
                >
                  {refundLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Processing...
                    </>
                  ) : (
                    'Process Refund'
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm sm:btn-md flex-1"
                  onClick={() => {
                    setShowRefundConfirm(false);
                    setUserToRefund(null);
                    setRefundReason('');
                  }}
                  disabled={refundLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* User Projects Modal */}
      {showProjectsModal && (
        <div
          className="modal modal-open"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowProjectsModal(false);
            }
          }}
        >
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              {selectedUserForProjects}'s Projects
            </h3>

            {userProjects.length === 0 ? (
              <p className="text-base-content/70">No projects found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th>Lock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProjects.map((project) => (
                      <tr key={project._id}>
                        <td>
                          <div className="font-semibold">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-base-content/70 truncate max-w-xs">
                              {project.description}
                            </div>
                          )}
                        </td>
                        <td>
                          {project.isArchived ? (
                            <span className="badge badge-ghost h-6 px-3 py-1 font-bold text-sm">Archived</span>
                          ) : project.isLocked ? (
                            <span className="badge badge-warning h-6 px-3 py-1 font-bold text-sm">Locked</span>
                          ) : (
                            <span className="badge badge-success h-6 px-3 py-1 font-bold text-sm">Active</span>
                          )}
                        </td>
                        <td>{new Date(project.updatedAt).toLocaleDateString()}</td>
                        <td>
                          {project.isLocked ? (
                            <div>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => toggleProjectLock(project._id, false)}
                              >
                                Unlock
                              </button>
                              {project.lockedReason && (
                                <div className="text-xs text-base-content/70 mt-1">
                                  {project.lockedReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => {
                                const reason = prompt('Enter lock reason (optional):');
                                toggleProjectLock(project._id, true, reason || undefined);
                              }}
                            >
                              Lock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-action">
              <button className="btn" onClick={() => setShowProjectsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminDashboardPage;