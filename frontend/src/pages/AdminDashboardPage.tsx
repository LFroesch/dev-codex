import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { analyticsAPI } from '../api';
import OptimizedAnalytics from '../components/OptimizedAnalytics';
import analyticsService from '../services/analytics';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  planTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus?: string;
  isAdmin: boolean;
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
    enterprise: number;
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

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<{ activeAdminTab?: 'users' | 'tickets' | 'analytics' }>();
  const activeTab = context?.activeAdminTab || 'users';
  const [ticketStatusTab, setTicketStatusTab] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('open');
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchTickets = async (pageNum: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        status: ticketStatusTab
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
      setTotalPages(data.pagination.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
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

  const sendPasswordReset = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
        method: 'POST',
        credentials: 'include'
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
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
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
      await fetchTickets(page);
      setSelectedTicket(null);
      setAdminResponse('');
      setRespondingToTicket(null);
    } catch (err: any) {
      alert('Failed to update ticket: ' + err.message);
    }
  };

  const resetAnalytics = async () => {
    try {
      setResettingAnalytics(true);
      const result = await analyticsAPI.resetAllAnalytics();
      alert(`Analytics reset successful! Deleted ${(result as any).deletedAnalytics} analytics events and ${(result as any).deletedSessions} sessions.`);
      setShowAnalyticsResetConfirm(false);
    } catch (err: any) {
      alert('Failed to reset analytics: ' + (err.response?.data?.error || err.message));
    } finally {
      setResettingAnalytics(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const startTime = performance.now();
      setLoading(true);
      
      try {
        if (activeTab === 'users') {
          await Promise.all([fetchUsers(1), fetchStats()]);
        } else {
          await fetchTickets(1);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
        
        // Track performance
        const loadTime = performance.now() - startTime;
        analyticsService.trackPerformance(`admin_dashboard_${activeTab}_load`, loadTime, 'AdminDashboardPage', {
          tab: activeTab,
          ticketStatus: ticketStatusTab
        });
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
        <div className="card w-96 bg-base-100 shadow-lg border border-base-content/10 rounded-lg">
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
      case 'enterprise': return 'badge-secondary';
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
    <div className="p-6">

        {/* Stats Cards */}
        {activeTab === 'users' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Total Users</div>
              <div className="stat-value text-primary">{stats.totalUsers}</div>
              <div className="stat-desc">↗︎ {stats.recentSignups} new this month</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Total Projects</div>
              <div className="stat-value text-secondary">{stats.totalProjects}</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Active Subscriptions</div>
              <div className="stat-value text-accent">{stats.activeSubscriptions}</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Plan Distribution</div>
              <div className="stat-value text-sm">
                <div>Free: {stats.planDistribution.free}</div>
                <div>Pro: {stats.planDistribution.pro}</div>
                <div>Enterprise: {stats.planDistribution.enterprise}</div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Stats Cards */}
        {activeTab === 'tickets' && ticketStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Open Tickets</div>
              <div className="stat-value text-error">{ticketStats.open}</div>
              <div className="stat-desc">Require attention</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">In Progress</div>
              <div className="stat-value text-warning">{ticketStats.inProgress}</div>
              <div className="stat-desc">Being worked on</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Resolved</div>
              <div className="stat-value text-success">{ticketStats.resolved}</div>
              <div className="stat-desc">Awaiting closure</div>
            </div>
            
            <div className="stat bg-base-100 rounded-lg shadow-lg border border-base-content/10">
              <div className="stat-title">Closed</div>
              <div className="stat-value text-neutral">{ticketStats.closed}</div>
              <div className="stat-desc">Completed tickets</div>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="card bg-base-100 shadow-lg border border-base-content/10 rounded-lg" style={{ overflow: 'visible' }}>
            <div className="card-body" style={{ overflow: 'visible' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Users</h2>
              <div className="badge badge-neutral">{users.length} of {stats?.totalUsers} total</div>
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
                            className={`badge ${getPlanBadgeColor(user.planTier)} cursor-pointer`}
                          >
                            {user.planTier}
                          </div>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32" style={{ zIndex: 9999 }}>
                            <li><a onClick={() => updateUserPlan(user._id, 'free')}>Free</a></li>
                            <li><a onClick={() => updateUserPlan(user._id, 'pro')}>Pro</a></li>
                            <li><a onClick={() => updateUserPlan(user._id, 'enterprise')}>Enterprise</a></li>
                          </ul>
                        </div>
                      </td>
                      <td>
                        <div className="text-center">
                          <span className="font-semibold">{user.projectCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`badge ${user.subscriptionStatus === 'active' ? 'badge-success' : 'badge-ghost'}`}>
                          {user.subscriptionStatus || 'inactive'}
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        {user.isAdmin && <div className="badge badge-warning">Admin</div>}
                      </td>
                      <td>
                        <div className="dropdown dropdown-end">
                          <div 
                            tabIndex={0}
                            role="button" 
                            className="btn btn-ghost btn-xs"
                          >
                            ⋮
                          </div>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48" style={{ zIndex: 9999 }}>
                            <li>
                              <a onClick={() => fetchUserDetails(user._id)}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </a>
                            </li>
                            <li>
                              <a onClick={() => sendPasswordReset(user._id)} className="text-warning">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Send Password Reset
                              </a>
                            </li>
                            <div className="divider my-1"></div>
                            <li>
                              <a 
                                className="text-error"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Tickets Table */}
        {activeTab === 'tickets' && (
          <div className="card bg-base-100 shadow-lg border border-base-content/10 rounded-lg" style={{ overflow: 'visible' }}>
            <div className="card-body p-4" style={{ overflow: 'visible' }}>

              {/* Ticket Status Tabs */}
              <div className="flex justify-center mb-2">
                <div className="tabs tabs-boxed tabs-lg bg-base-200 shadow-lg border border-base-content/10 rounded-lg">
                <button 
                  className={`tab tab-lg font-bold text-base ${ticketStatusTab === 'open' ? 'tab-active' : ''}`}
                  onClick={() => {
                    setTicketStatusTab('open');
                    setPage(1);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Open ({ticketStats?.open || 0})
                </button>
                <button 
                  className={`tab tab-lg font-bold text-base ${ticketStatusTab === 'in_progress' ? 'tab-active' : ''}`}
                  onClick={() => {
                    setTicketStatusTab('in_progress');
                    setPage(1);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  In Progress ({ticketStats?.inProgress || 0})
                </button>
                <button 
                  className={`tab tab-lg font-bold text-base ${ticketStatusTab === 'resolved' ? 'tab-active' : ''}`}
                  onClick={() => {
                    setTicketStatusTab('resolved');
                    setPage(1);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resolved ({ticketStats?.resolved || 0})
                </button>
                <button 
                  className={`tab tab-lg font-bold text-base ${ticketStatusTab === 'closed' ? 'tab-active' : ''}`}
                  onClick={() => {
                    setTicketStatusTab('closed');
                    setPage(1);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Closed ({ticketStats?.closed || 0})
                </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '200px' }}>
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>User</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket._id} className={selectedTicket?._id === ticket._id ? 'bg-primary/10' : ''}>
                        <td>
                          <code className="text-xs">{ticket.ticketId}</code>
                        </td>
                        <td>
                          <div>
                            <div className="font-semibold">
                              {ticket.userId.firstName} {ticket.userId.lastName}
                            </div>
                            <div className="text-sm text-base-content/60">{ticket.userId.email}</div>
                            <div className={`badge badge-xs ${getPlanBadgeColor(ticket.userId.planTier)}`}>
                              {ticket.userId.planTier}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="max-w-xs">
                            <div className="font-medium truncate" title={ticket.subject}>
                              {ticket.subject}
                            </div>
                            <div className="text-xs text-base-content/60 truncate" title={ticket.message}>
                              {ticket.message}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="badge badge-outline whitespace-nowrap">
                            {ticket.category.replace('_', ' ')}
                          </div>
                        </td>
                        <td>
                          <div className={`badge ${getPriorityBadgeColor(ticket.priority)} whitespace-nowrap`}>
                            {ticket.priority}
                          </div>
                        </td>
                        <td>
                          <div className={`badge ${getStatusBadgeColor(ticket.status)} whitespace-nowrap`}>
                            {getStatusDisplayText(ticket.status)}
                          </div>
                        </td>
                        <td>{formatDate(ticket.createdAt)}</td>
                        <td>
                          <div className="dropdown dropdown-end">
                            <div 
                              tabIndex={0}
                              role="button" 
                              className="btn btn-ghost btn-xs"
                            >
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 z-50">
                              <li>
                                <a 
                                  onClick={() => setSelectedTicket(selectedTicket?._id === ticket._id ? null : ticket)}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {selectedTicket?._id === ticket._id ? 'Hide Details' : 'View Details'}
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="text-primary"
                                  onClick={() => {
                                    setRespondingToTicket(ticket.ticketId);
                                    setAdminResponse('');
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Send Response
                                </a>
                              </li>
                              <div className="divider my-1"></div>
                                
                                {/* Status-specific actions */}
                                {ticket.status === 'open' && (
                                  <li>
                                    <a 
                                      className="text-warning"
                                      onClick={() => updateTicket(ticket.ticketId, 'in_progress')}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Start Working
                                    </a>
                                  </li>
                                )}
                                
                                {ticket.status === 'in_progress' && (
                                  <li>
                                    <a 
                                      className="text-success"
                                      onClick={() => updateTicket(ticket.ticketId, 'resolved')}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Mark Resolved
                                    </a>
                                  </li>
                                )}
                                
                                {ticket.status === 'resolved' && (
                                  <>
                                    <li>
                                      <a 
                                        className="text-neutral"
                                        onClick={() => updateTicket(ticket.ticketId, 'closed')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Close Ticket
                                      </a>
                                    </li>
                                    <li>
                                      <a 
                                        className="text-warning"
                                        onClick={() => updateTicket(ticket.ticketId, 'in_progress')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Reopen
                                      </a>
                                    </li>
                                  </>
                                )}
                                
                                {ticket.status === 'closed' && (
                                  <li>
                                    <a 
                                      className="text-warning"
                                      onClick={() => updateTicket(ticket.ticketId, 'in_progress')}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Reopen Ticket
                                    </a>
                                  </li>
                                )}
                                
                                <div className="divider my-1"></div>
                                <li>
                                  <a className="text-error">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Ticket
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

              {/* Ticket Details */}
              {selectedTicket && (
                <div className="mt-6 p-4 bg-base-200 shadow-lg border border-base-content/10 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">Ticket Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <strong>Subject:</strong> {selectedTicket.subject}
                    </div>
                    <div>
                      <strong>Category:</strong> {selectedTicket.category.replace('_', ' ')}
                    </div>
                    <div>
                      <strong>Priority:</strong> {selectedTicket.priority}
                    </div>
                    <div>
                      <strong>Status:</strong> {getStatusDisplayText(selectedTicket.status)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <strong>Message:</strong>
                    <div className="bg-base-100 p-3 rounded mt-2 whitespace-pre-wrap">
                      {selectedTicket.message}
                    </div>
                  </div>
                  {selectedTicket.adminResponse && (
                    <div>
                      <strong>Admin Response:</strong>
                      <div className="bg-success/10 p-3 rounded mt-2 whitespace-pre-wrap">
                        {selectedTicket.adminResponse}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Response Form */}
              {respondingToTicket && (
                <div className="mt-6 p-4 bg-warning/10 shadow-lg border border-base-content/10 rounded-lg">
                  <h3 className="font-bold text-lg mb-4">Respond to Ticket: {respondingToTicket}</h3>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-semibold">Response</span>
                    </label>
                    <textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Type your response to the user..."
                      className="textarea textarea-bordered h-24 w-full"
                      maxLength={2000}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {adminResponse.length}/2000 characters
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      className="btn btn-primary"
                      onClick={() => updateTicket(respondingToTicket, undefined, adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      Send Response
                    </button>
                    <button 
                      className="btn btn-warning"
                      onClick={() => updateTicket(respondingToTicket, 'in_progress', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      Send & Mark In Progress
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => updateTicket(respondingToTicket, 'resolved', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      Send & Mark Resolved
                    </button>
                    <button 
                      className="btn btn-neutral"
                      onClick={() => updateTicket(respondingToTicket, 'closed', adminResponse)}
                      disabled={!adminResponse.trim()}
                    >
                      Send & Close
                    </button>
                    <button 
                      className="btn btn-ghost"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="join">
                    <button 
                      className="join-item btn"
                      disabled={page <= 1}
                      onClick={() => {
                        const currentTab = activeTab as 'users' | 'tickets' | 'analytics';
                        switch (currentTab) {
                          case 'users':
                            fetchUsers(page - 1);
                            break;
                          case 'tickets':
                            fetchTickets(page - 1);
                            break;
                        }
                      }}
                    >
                      «
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        className={`join-item btn ${pageNum === page ? 'btn-active' : ''}`}
                        onClick={() => {
                          const currentTab = activeTab as 'users' | 'tickets' | 'analytics';
                          switch (currentTab) {
                            case 'users':
                              fetchUsers(pageNum);
                              break;
                            case 'tickets':
                              fetchTickets(pageNum);
                              break;
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                    
                    <button 
                      className="join-item btn"
                      disabled={page >= totalPages}
                      onClick={() => {
                        const currentTab = activeTab as 'users' | 'tickets' | 'analytics';
                        switch (currentTab) {
                          case 'users':
                            fetchUsers(page + 1);
                            break;
                          case 'tickets':
                            fetchTickets(page + 1);
                            break;
                        }
                      }}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <OptimizedAnalytics 
            onResetAnalytics={() => setShowAnalyticsResetConfirm(true)}
          />
        )}

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">User Details</h2>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedUser(null)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label className="font-semibold text-base-content/70">Plan </label>
                    <div className={`badge ${getPlanBadgeColor(selectedUser.planTier)} badge-lg`}>
                      {selectedUser.planTier}
                    </div>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70">Status </label>
                    <div className={`badge ${selectedUser.subscriptionStatus === 'active' ? 'badge-success' : 'badge-ghost'} badge-lg`}>
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
                    <label className="font-semibold text-base-content/70">Admin Status </label>
                    <div className={`badge ${selectedUser.isAdmin ? 'badge-warning' : 'badge-neutral'} badge-lg`}>
                      {selectedUser.isAdmin ? 'Admin' : 'Regular User'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="font-semibold text-base-content/70">User ID</label>
                    <p className="text-sm font-mono bg-base-200 p-2 rounded">{selectedUser._id}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  className="btn btn-warning"
                  onClick={() => {
                    sendPasswordReset(selectedUser._id);
                    setSelectedUser(null);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                  Send Password Reset
                </button>
                <button 
                  className="btn btn-error"
                  onClick={() => {
                    setUserToDelete(selectedUser);
                    setShowDeleteConfirm(true);
                    setSelectedUser(null);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-center mb-4">Delete User Account</h3>
              
              <p className="text-center text-base-content/70 mb-6">
                Are you sure you want to delete <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>?
              </p>
              
              <div className="bg-error/10 p-4 rounded-lg mb-6">
                <p className="text-sm text-error font-semibold mb-2">⚠️ This action cannot be undone!</p>
                <ul className="text-sm text-base-content/70 space-y-1">
                  <li>• User account will be permanently deleted</li>
                  <li>• All user projects will be deleted</li>
                  <li>• User data cannot be recovered</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button 
                  className="btn btn-ghost flex-1"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-error flex-1"
                  onClick={() => deleteUser(userToDelete._id)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Reset Confirmation Modal */}
        {showAnalyticsResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-center mb-4">Reset Analytics Data</h3>
              
              <p className="text-center text-base-content/70 mb-6">
                Are you sure you want to reset all analytics data? This will clear all session tracking and user activity data.
              </p>
              
              <div className="bg-error/10 p-4 rounded-lg mb-6">
                <p className="text-sm text-error font-semibold mb-2">⚠️ This action cannot be undone!</p>
                <ul className="text-sm text-base-content/70 space-y-1">
                  <li>• All analytics events will be deleted</li>
                  <li>• All user session data will be cleared</li>
                  <li>• Historical usage data will be lost</li>
                  <li>• This is useful for dev/testing environments</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button 
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowAnalyticsResetConfirm(false)}
                  disabled={resettingAnalytics}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-error flex-1"
                  onClick={resetAnalytics}
                  disabled={resettingAnalytics}
                >
                  {resettingAnalytics ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Analytics
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminDashboardPage;