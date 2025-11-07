import React, { useState, useEffect } from 'react';
import { UserAvatar, StatusBadge, PlanBadge, LoadingSkeleton } from '../shared';
import ConfirmationModal from '../../ConfirmationModal';
import { csrfFetch } from '../../../utils/csrf';
import { toast } from '../../../services/toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isBanned: boolean;
  isAdmin: boolean;
  planTier: 'free' | 'pro' | 'premium';
  subscriptionStatus?: string;
  createdAt: string;
  lastLogin?: string;
  projectCount?: number;
  recentActivity?: number;
  bannedAt?: string;
  banReason?: string;
  bannedBy?: string;
}

/**
 * UsersTab - Redesigned admin users management interface
 * Features search, filters, avatars, card/table views, and mobile responsive design
 */
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, filterPlan, filterStatus, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filterPlan !== 'all' && { plan: filterPlan }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotalUsers(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusType = (user: User): 'active' | 'inactive' | 'banned' | 'admin' => {
    if (user.isBanned) return 'banned';
    if (user.isAdmin) return 'admin';
    // Active if logged in within last 30 days
    if (user.lastLogin) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(user.lastLogin) >= thirtyDaysAgo) return 'active';
    }
    return 'inactive';
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user details');
      const userData = await response.json();
      setSelectedUser(userData);
      setShowUserDetailsModal(true);
    } catch (err: any) {
      toast.error('Failed to fetch user details: ' + err.message);
    }
  };

  const handleUpdatePlan = async (userId: string, newPlan: 'free' | 'pro' | 'premium') => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: newPlan })
      });
      if (!response.ok) throw new Error('Failed to update user plan');
      toast.success('User plan updated successfully!');
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to update user plan: ' + err.message);
    }
  };

  const handleBanUser = async () => {
    if (!userToBan || !banReason.trim()) return;
    try {
      setBanLoading(true);
      const response = await csrfFetch(`/api/admin/users/${userToBan._id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banReason })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to ban user');
      }
      toast.success('User banned successfully!');
      setShowBanModal(false);
      setUserToBan(null);
      setBanReason('');
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to ban user: ' + err.message);
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unban user');
      }
      toast.success('User unbanned successfully!');
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to unban user: ' + err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const response = await csrfFetch(`/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      toast.success('User deleted successfully!');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user: ' + err.message);
    }
  };

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user) => (
        <div key={user._id} className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-200 border border-base-content/10">
          <div className="card-body p-4">
            <div className="flex items-start gap-3 mb-3">
              <UserAvatar name={`${user.firstName} ${user.lastName}`} email={user.email} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-base-content/60 truncate">{user.email}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <StatusBadge status={getStatusType(user)} size="sm" />
                  <PlanBadge plan={user.planTier} size="sm" />
                </div>
              </div>
            </div>

            <div className="divider my-1"></div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="bg-base-200/50 rounded-lg p-2">
                <div className="text-xs text-base-content/60 uppercase font-semibold mb-1">Projects</div>
                <div className="text-lg font-bold">{user.projectCount || 0}</div>
              </div>
              <div className="bg-base-200/50 rounded-lg p-2">
                <div className="text-xs text-base-content/60 uppercase font-semibold mb-1">Last Login</div>
                <div className="text-sm font-semibold">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-base-content/60 uppercase font-semibold">Joined: </span>
                <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="card-actions justify-end mt-2 gap-1">
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleViewDetails(user._id)}
              >
                View
              </button>
              <div className="dropdown dropdown-end">
                <button className="btn btn-xs btn-primary" tabIndex={0}>
                  Actions ▾
                </button>
                <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-50 border border-base-content/10">
                  <li className="menu-title"><span>Plan</span></li>
                  <li><a onClick={() => handleUpdatePlan(user._id, 'free')}>Set to Free</a></li>
                  <li><a onClick={() => handleUpdatePlan(user._id, 'pro')}>Set to Pro</a></li>
                  <li><a onClick={() => handleUpdatePlan(user._id, 'premium')}>Set to Premium</a></li>
                  <li className="divider"></li>
                  {!user.isBanned ? (
                    <li><a onClick={() => { setUserToBan(user); setShowBanModal(true); }} className="text-error">Ban User</a></li>
                  ) : (
                    <li><a onClick={() => handleUnbanUser(user._id)} className="text-success">Unban User</a></li>
                  )}
                  <li><a onClick={() => { setUserToDelete(user); setShowDeleteConfirm(true); }} className="text-error">Delete User</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="overflow-x-auto border border-base-content/10 rounded-lg">
      <table className="table table-zebra">
        <thead className="bg-base-200">
          <tr>
            <th className="font-bold">User</th>
            <th className="font-bold">Status</th>
            <th className="font-bold">Plan</th>
            <th className="font-bold text-center">Projects</th>
            <th className="font-bold">Last Active</th>
            <th className="font-bold">Joined</th>
            <th className="font-bold text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="hover">
              <td>
                <div className="flex items-center gap-3">
                  <UserAvatar name={`${user.firstName} ${user.lastName}`} email={user.email} size="md" />
                  <div>
                    <div className="font-semibold text-base">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-base-content/60">{user.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <StatusBadge status={getStatusType(user)} size="sm" />
              </td>
              <td>
                <PlanBadge plan={user.planTier} size="sm" />
              </td>
              <td className="text-center">
                <span className="font-semibold text-lg">{user.projectCount || 0}</span>
              </td>
              <td className="text-sm whitespace-nowrap">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
              <td className="text-sm whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <div className="flex gap-1 justify-center">
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleViewDetails(user._id)}
                  >
                    View
                  </button>
                  <div className="dropdown dropdown-end">
                    <button className="btn btn-xs btn-primary" tabIndex={0}>
                      ⋮
                    </button>
                    <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-50 border border-base-content/10">
                      <li className="menu-title"><span>Plan</span></li>
                      <li><a onClick={() => handleUpdatePlan(user._id, 'free')}>Set to Free</a></li>
                      <li><a onClick={() => handleUpdatePlan(user._id, 'pro')}>Set to Pro</a></li>
                      <li><a onClick={() => handleUpdatePlan(user._id, 'premium')}>Set to Premium</a></li>
                      <li className="divider"></li>
                      {!user.isBanned ? (
                        <li><a onClick={() => { setUserToBan(user); setShowBanModal(true); }} className="text-error">Ban User</a></li>
                      ) : (
                        <li><a onClick={() => handleUnbanUser(user._id)} className="text-success">Unban User</a></li>
                      )}
                      <li><a onClick={() => { setUserToDelete(user); setShowDeleteConfirm(true); }} className="text-error">Delete User</a></li>
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-base-content/70 mt-1">Manage and monitor all platform users</p>
      </div>

      {/* Filters & Search */}
      <div className="card bg-base-100 shadow-md border border-base-content/10">
        <div className="card-body p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <div className="join w-full">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input input-bordered join-item w-full"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
                <button className="btn btn-square join-item">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="select select-bordered select-sm"
                value={filterPlan}
                onChange={(e) => {
                  setFilterPlan(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>

              <select
                className="select select-bordered select-sm"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active (Logged in &lt; 30d)</option>
                <option value="inactive">Inactive (No login 30d+)</option>
                <option value="banned">Banned</option>
              </select>

              {/* View Toggle */}
              <div className="join">
                <button
                  className={`join-item btn btn-sm ${viewMode === 'cards' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Card View"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* Results count */}
              {!loading && (
                <div className="badge badge-neutral badge-lg">
                  {totalUsers > 0 ? `${users.length} of ${totalUsers} users` : `${users.length} users`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <LoadingSkeleton type={viewMode === 'cards' ? 'card' : 'table'} count={viewMode === 'cards' ? 6 : 1} />
      ) : users.length === 0 ? (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center py-12">
            <p className="text-base-content/70">No users found matching your criteria</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? renderCardView() : renderTableView()}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="join">
                <button
                  className="join-item btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  «
                </button>
                {/* Show first page */}
                {page > 3 && (
                  <>
                    <button className="join-item btn" onClick={() => setPage(1)}>1</button>
                    {page > 4 && <button className="join-item btn btn-disabled">...</button>}
                  </>
                )}

                {/* Show pages around current page */}
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === page || (pageNum >= page - 2 && pageNum <= page + 2)) {
                    return (
                      <button
                        key={i}
                        className={`join-item btn ${page === pageNum ? 'btn-active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}

                {/* Show last page */}
                {page < totalPages - 2 && (
                  <>
                    {page < totalPages - 3 && <button className="join-item btn btn-disabled">...</button>}
                    <button className="join-item btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                  </>
                )}

                <button
                  className="join-item btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">User Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-base-content/70">Name</label>
                <p className="text-lg">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div>
                <label className="font-semibold text-base-content/70">Email</label>
                <p className="text-lg">{selectedUser.email}</p>
              </div>
              <div>
                <label className="font-semibold text-base-content/70">Plan</label>
                <div className="mt-1">
                  <PlanBadge plan={selectedUser.planTier} />
                </div>
              </div>
              <div>
                <label className="font-semibold text-base-content/70">Projects</label>
                <p className="text-lg">{selectedUser.projectCount || 0}</p>
              </div>
              <div>
                <label className="font-semibold text-base-content/70">Status</label>
                <div className="mt-1">
                  <StatusBadge status={getStatusType(selectedUser)} />
                </div>
              </div>
              <div>
                <label className="font-semibold text-base-content/70">Joined</label>
                <p className="text-lg">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            {selectedUser.isBanned && (
              <div className="mt-4 p-3 bg-error/10 border-2 border-error/20 rounded-lg">
                <p className="font-semibold text-error mb-1">User is Banned</p>
                {selectedUser.banReason && <p className="text-sm">Reason: {selectedUser.banReason}</p>}
                {selectedUser.bannedAt && <p className="text-xs text-base-content/60">Banned on {new Date(selectedUser.bannedAt).toLocaleDateString()}</p>}
              </div>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => setShowUserDetailsModal(false)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowUserDetailsModal(false)}></div>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && userToBan && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Ban User</h3>
            <p className="mb-4">
              You are about to ban <strong>{userToBan.firstName} {userToBan.lastName}</strong>
            </p>
            <div className="bg-error/10 border-2 border-error/20 p-3 rounded-lg mb-4">
              <p className="text-error font-semibold mb-1">Warning</p>
              <ul className="text-sm text-base-content/70 list-disc list-inside">
                <li>User will be immediately logged out</li>
                <li>User will not be able to access their account</li>
                <li>User can be unbanned by admins</li>
              </ul>
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
            <div className="modal-action">
              <button
                className="btn btn-error"
                onClick={handleBanUser}
                disabled={!banReason.trim() || banLoading}
              >
                {banLoading ? 'Banning...' : 'Ban User'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowBanModal(false); setBanReason(''); setUserToBan(null); }}
                disabled={banLoading}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowBanModal(false); setBanReason(''); setUserToBan(null); }}></div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm && !!userToDelete}
        onConfirm={handleDeleteUser}
        onCancel={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
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
    </div>
  );
};

export default UsersTab;
