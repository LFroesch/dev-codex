import React from 'react';

type StatusType = 'active' | 'inactive' | 'banned' | 'admin' | 'pending' | 'success' | 'error' | 'warning';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * StatusBadge component for displaying status indicators
 * Supports multiple status types with appropriate colors
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = ''
}) => {
  const statusConfig: Record<StatusType, { color: string; defaultLabel: string }> = {
    active: { color: 'badge-success', defaultLabel: 'Active' },
    inactive: { color: 'badge-ghost', defaultLabel: 'Inactive' },
    banned: { color: 'badge-error', defaultLabel: 'Banned' },
    admin: { color: 'badge-warning', defaultLabel: 'Admin' },
    pending: { color: 'badge-info', defaultLabel: 'Pending' },
    success: { color: 'badge-success', defaultLabel: 'Success' },
    error: { color: 'badge-error', defaultLabel: 'Error' },
    warning: { color: 'badge-warning', defaultLabel: 'Warning' }
  };

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg'
  };

  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} ${className}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
