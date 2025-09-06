import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  autoNavigate?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Search',
  size = 'sm',
  className = '',
  autoNavigate = true
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    
    if (autoNavigate && value.trim() && searchParams.get('view') !== 'projects') {
      navigate('/notes?view=projects');
    }
  };

  const handleClear = () => {
    onSearchChange('');
  };

  const sizeClasses = {
    sm: 'input-sm h-9 w-48',
    md: 'h-10 w-64'
  };

  return (
    <div className={`relative ${className}`}>
      <svg 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/70 z-50 pointer-events-none" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        className={`input pl-10 pr-10 ${sizeClasses[size]} bg-base-100/80 backdrop-blur-none shadow-sm border border-base-content/20 rounded-lg focus:border-primary text-base-content/40`}
      />
      
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/70 hover:text-base-content/80 transition-colors"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;