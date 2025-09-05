import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { unsavedChangesManager } from '../utils/unsavedChanges';

interface UserMenuProps {
  user: any;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleNavigation = async (path: string) => {
    const allowed = await unsavedChangesManager.checkNavigationAllowed();
    if (allowed) {
      navigate(path);
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative z-[70]" ref={dropdownRef}>
      <button 
        className="btn btn-ghost btn-circle relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-base-100 rounded-box z-[10000] p-2 shadow-lg border border-base-content/20">
        <div className="flex justify-between items-center p-2">
          <h3 className="font-semibold">User Menu</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200"
            onClick={() => handleNavigation('/billing')}
          >
            Billing & Plans
          </div>
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200"
            onClick={() => handleNavigation('/account-settings')}
          >
            Account Settings
          </div>
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200"
            onClick={() => handleNavigation('/news')}
          >
            What's New?
          </div>
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200"
            onClick={() => handleNavigation('/help')}
          >
            Help & Info
          </div>
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200"
            onClick={() => handleNavigation('/support')}
          >
            Contact Support
          </div>
          {user?.isAdmin && (
            <>
            <hr className="my-2 border-base-content/20" />
            <div 
              className="p-2 rounded cursor-pointer hover:bg-base-200"
              onClick={() => handleNavigation('/admin')}
            >
              Admin Dashboard
            </div>
            </>
          )}
          <hr className="my-2 border-base-content/20" />
          <div 
            className="p-2 rounded cursor-pointer hover:bg-base-200 text-error"
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
          >
            Logout
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;