import React from 'react';

interface TabGroupProps {
  children: React.ReactNode;
  centered?: boolean;
  className?: string;
}

const TabGroup: React.FC<TabGroupProps> = ({ children, centered = true, className = '' }) => {
  return (
    <div className={`${centered ? 'flex justify-center' : ''} ${className}`}>
      <div className="tabs-container p-1">
        {children}
      </div>
    </div>
  );
};

export default TabGroup;
