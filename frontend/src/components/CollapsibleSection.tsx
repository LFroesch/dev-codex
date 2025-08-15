import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-base-100 rounded-lg border border-base-content/10 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-base-200 transition-colors"
      >
        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex-1">{title}</div>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 border-t border-base-content/10">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;