import React from 'react';

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  getContrastColor: () => string;
  children: React.ReactNode;
  className?: string;
}

const TabButton: React.FC<TabButtonProps> = ({
  isActive,
  onClick,
  getContrastColor,
  children,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`tab-button ${isActive ? 'tab-active' : ''} ${className}`}
      style={isActive ? { color: getContrastColor() } : {}}
    >
      {children}
    </button>
  );
};

export default TabButton;
