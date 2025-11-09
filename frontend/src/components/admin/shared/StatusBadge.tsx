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
    sm: 'h-5 px-2 py-0.5 text-xs',
    md: 'h-6 px-3 py-1 text-sm',
    lg: 'h-7 px-4 py-1 text-base'
  };

  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} font-bold ${className}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
