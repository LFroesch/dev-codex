import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'stat' | 'text' | 'avatar' | 'badge';
  count?: number;
  className?: string;
}

/**
 * LoadingSkeleton component for showing loading states
 * Provides different skeleton types for various UI elements
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`card bg-base-100 shadow-lg animate-pulse ${className}`}>
            <div className="card-body">
              <div className="h-4 bg-base-300 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-base-300 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-base-300 rounded w-2/3"></div>
            </div>
          </div>
        );

      case 'stat':
        return (
          <div className={`card bg-base-100 shadow-lg border-2 border-base-content/20 animate-pulse ${className}`}>
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-3 bg-base-300 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-base-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-base-300 rounded w-1/3"></div>
                </div>
                <div className="w-12 h-12 bg-base-300 rounded-full"></div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`overflow-x-auto animate-pulse ${className}`}>
            <table className="table w-full">
              <thead>
                <tr>
                  <th><div className="h-4 bg-base-300 rounded w-20"></div></th>
                  <th><div className="h-4 bg-base-300 rounded w-24"></div></th>
                  <th><div className="h-4 bg-base-300 rounded w-16"></div></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="h-4 bg-base-300 rounded w-32"></div></td>
                    <td><div className="h-4 bg-base-300 rounded w-40"></div></td>
                    <td><div className="h-4 bg-base-300 rounded w-20"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'text':
        return (
          <div className={`space-y-2 animate-pulse ${className}`}>
            <div className="h-4 bg-base-300 rounded w-full"></div>
            <div className="h-4 bg-base-300 rounded w-5/6"></div>
            <div className="h-4 bg-base-300 rounded w-4/6"></div>
          </div>
        );

      case 'avatar':
        return (
          <div className={`w-10 h-10 bg-base-300 rounded-full animate-pulse ${className}`}></div>
        );

      case 'badge':
        return (
          <div className={`h-6 w-16 bg-base-300 rounded-full animate-pulse ${className}`}></div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <React.Fragment key={i}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

export default LoadingSkeleton;
