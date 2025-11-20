import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';

interface FavoriteButtonProps {
  projectId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  projectId,
  size = 'md',
  showCount = false
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: 'btn-xs',
    md: 'btn-sm',
    lg: 'btn-md'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  useEffect(() => {
    checkFavoriteStatus();
    if (showCount) {
      fetchCount();
    }
  }, [projectId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await apiClient.get(`/favorites/check/${projectId}`);
      if (response.data.success) {
        setIsFavorited(response.data.isFavorited);
      }
    } catch (err) {
      console.error('Failed to check favorite status:', err);
    }
  };

  const fetchCount = async () => {
    try {
      const response = await apiClient.get(`/favorites/count/${projectId}`);
      if (response.data.success) {
        setCount(response.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch favorite count:', err);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default link behavior
    e.stopPropagation(); // Prevent triggering parent click events

    if (loading) return;
    setLoading(true);

    try {
      if (isFavorited) {
        const response = await apiClient.delete(`/favorites/${projectId}`);
        if (response.data.success) {
          setIsFavorited(false);
          if (showCount) setCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const response = await apiClient.post(`/favorites/${projectId}`);
        if (response.data.success) {
          setIsFavorited(true);
          if (showCount) setCount(prev => prev + 1);
        }
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`btn ${sizeClasses[size]} ${
        isFavorited ? 'btn-warning' : 'btn-ghost'
      } gap-1 border-thick`}
      onClick={toggleFavorite}
      disabled={loading}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? (
        <svg
          className={iconSizes[size]}
          fill="currentColor"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ) : (
        <svg
          className={iconSizes[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      )}
      {showCount && count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
};

export default FavoriteButton;
