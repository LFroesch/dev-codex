import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="loading loading-spinner loading-lg text-primary"></div>
    </div>
  );
};

export default LoadingSpinner;