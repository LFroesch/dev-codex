import React from 'react';

type PlanTier = 'free' | 'pro' | 'premium';

interface PlanBadgeProps {
  plan: PlanTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * PlanBadge component for displaying user plan tiers
 * Shows appropriate colors and icons for each tier
 */
const PlanBadge: React.FC<PlanBadgeProps> = ({
  plan,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const planConfig: Record<PlanTier, { color: string; label: string; icon: string }> = {
    free: {
      color: 'badge-ghost',
      label: 'Free',
      icon: '📦'
    },
    pro: {
      color: 'badge-primary',
      label: 'Pro',
      icon: '💎'
    },
    premium: {
      color: 'badge-secondary',
      label: 'Premium',
      icon: '⭐'
    }
  };

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg'
  };

  const config = planConfig[plan];

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} gap-1 ${className}`}>
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

export default PlanBadge;
