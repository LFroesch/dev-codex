import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';

interface FollowButtonProps {
  type: 'user' | 'project';
  id: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({ type, id, size = 'md', className = '' }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: 'btn-xs',
    md: 'btn-sm',
    lg: 'btn-md'
  };

  useEffect(() => {
    checkFollowStatus();
  }, [type, id]);

  const checkFollowStatus = async () => {
    try {
      const response = await apiClient.get(`/follows/check/${type}/${id}`);
      if (response.data.success) {
        setIsFollowing(response.data.isFollowing);
      }
    } catch (err) {
    }
  };

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      if (isFollowing) {
        const response = await apiClient.delete(`/follows/${type}/${id}`);
        if (response.data.success) {
          setIsFollowing(false);
        }
      } else {
        const response = await apiClient.post(`/follows/${type}/${id}`);
        if (response.data.success) {
          setIsFollowing(true);
        }
      }
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`btn ${sizeClasses[size]} ${
        isFollowing ? 'btn-outline' : 'btn-primary'
      } gap-1 border-thick ${className}`}
      onClick={toggleFollow}
      disabled={loading}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <>
          {isFollowing ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Following
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Follow
            </>
          )}
        </>
      )}
    </button>
  );
};

export default FollowButton;
