import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';

interface LikeButtonProps {
  postId?: string;
  commentId?: string;
  initialLikes?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  commentId,
  initialLikes = 0,
  size = 'md',
  showCount = true
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const targetType = postId ? 'posts' : 'comments';
  const targetId = postId || commentId;

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
    if (targetId) {
      checkLikeStatus();
    }
  }, [targetId]);

  const checkLikeStatus = async () => {
    if (!targetId) return;
    try {
      const response = await apiClient.get(`/likes/${targetType}/${targetId}/check`);
      if (response.data.success) {
        setIsLiked(response.data.isLiked);
      }
    } catch (err) {
      console.error('Failed to check like status:', err);
    }
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading || !targetId) return;
    setLoading(true);

    try {
      if (isLiked) {
        const response = await apiClient.delete(`/likes/${targetType}/${targetId}`);
        if (response.data.success) {
          setIsLiked(false);
          setCount(response.data.likesCount);
        }
      } else {
        const response = await apiClient.post(`/likes/${targetType}/${targetId}`);
        if (response.data.success) {
          setIsLiked(true);
          setCount(response.data.likesCount);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // User not logged in - could show a message or redirect
        console.log(`Please log in to like ${targetType}`);
      } else {
        console.error('Failed to toggle like:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`btn ${sizeClasses[size]} ${
        isLiked ? 'btn-error' : 'btn-ghost'
      } gap-1 border-thick`}
      onClick={toggleLike}
      disabled={loading}
      title={isLiked ? 'Unlike' : 'Like'}
    >
      {isLiked ? (
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
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
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
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
      {showCount && count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
};

export default LikeButton;
