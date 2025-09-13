import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'lg', 
  text = 'Loading...', 
  className = '' 
}) => {
  return (
    <div 
      className={`flex justify-center items-center ${className}`}
      data-testid="loading-container"
    >
      <div 
        className={`loading loading-spinner loading-${size} text-primary`}
        role="status"
        aria-label="Loading"
        data-testid="loading-spinner"
      />
      {text && (
        <span className="ml-2 text-base-content">{text}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;