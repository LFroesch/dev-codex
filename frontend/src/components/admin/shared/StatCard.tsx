import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * StatCard component for displaying key metrics on the admin dashboard
 * Follows DaisyUI design system with support for trends and icons
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick,
  className = ''
}) => {
  const baseClasses = 'card bg-base-100 shadow-lg border-2 border-base-content/20';
  const interactiveClasses = onClick ? 'hover:shadow-xl transition-shadow cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-base-content/70 mb-1">
              {title}
            </h3>
            <div className="text-2xl font-bold text-base-content">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-base-content/60 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2 gap-1">
                {trend.isPositive ? (
                  <svg
                    className="w-4 h-4 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-error"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive ? 'text-success' : 'text-error'
                  }`}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="ml-4 text-primary opacity-80">
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
