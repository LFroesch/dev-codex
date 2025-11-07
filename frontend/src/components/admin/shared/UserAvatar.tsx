import React from 'react';

interface UserAvatarProps {
  name: string;
  email?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * UserAvatar component that displays user initials in a colored circle
 * Color is deterministically generated from the name hash
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  size = 'md',
  className = ''
}) => {
  // Generate initials from name
  const getInitials = (name: string): string => {
    if (!name) return '?';

    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate deterministic color from name
  const getColorFromName = (name: string): string => {
    if (!name) return 'bg-base-300';

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      'bg-primary text-primary-content',
      'bg-secondary text-secondary-content',
      'bg-accent text-accent-content',
      'bg-info text-info-content',
      'bg-success text-success-content',
      'bg-warning text-warning-content',
      'bg-error text-error-content',
      'bg-purple-500 text-white',
      'bg-pink-500 text-white',
      'bg-indigo-500 text-white'
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const initials = getInitials(name || email || '?');
  const colorClass = getColorFromName(name || email || '');

  return (
    <div className={`avatar placeholder ${className}`}>
      <div className={`${colorClass} ${sizeClasses[size]} rounded-full font-semibold flex items-center justify-center`}>
        <span>{initials}</span>
      </div>
    </div>
  );
};

export default UserAvatar;
