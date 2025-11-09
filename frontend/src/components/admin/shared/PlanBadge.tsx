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
    sm: 'h-5 px-2 py-0.5 text-xs',
    md: 'h-6 px-3 py-1 text-sm',
    lg: 'h-7 px-4 py-1 text-base'
  };

  const config = planConfig[plan];

  return (
    <span className={`badge ${config.color} ${sizeClasses[size]} font-bold gap-1 ${className}`}>
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};

export default PlanBadge;
