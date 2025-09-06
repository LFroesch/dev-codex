import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'mobile' | 'tablet' | 'desktop';
  showTitle?: boolean;
  onClick?: () => void;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'mobile', 
  showTitle = true, 
  onClick,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleClick = onClick || (() => navigate('/notes?view=projects'));

  const sizeClasses = {
    mobile: 'w-7 h-7',
    tablet: 'tablet:w-8 tablet:h-8 w-7 h-7', 
    desktop: 'w-8 h-8'
  };

  const iconSizeClasses = {
    mobile: 'w-3.5 h-3.5',
    tablet: 'tablet:w-4 tablet:h-4 w-3.5 h-3.5',
    desktop: 'w-4 h-4'
  };

  const titleSizeClasses = {
    mobile: 'text-base',
    tablet: 'tablet:text-xl text-base',
    desktop: 'text-xl'
  };

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className={`${sizeClasses[size]} bg-primary rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
        <svg 
          className={`${iconSizeClasses[size]} text-primary-content`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      </div>
      {showTitle && (
        <h1 className={`${titleSizeClasses[size]} font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text whitespace-nowrap`}>
          Dev Codex
        </h1>
      )}
    </div>
  );
};

export default Logo;