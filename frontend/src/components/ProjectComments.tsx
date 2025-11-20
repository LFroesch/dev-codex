import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';

interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  displayPreference: 'name' | 'username';
  isPublic?: boolean;
  publicSlug?: string;
}

interface Comment {
  _id: string;
  content: string;
  userId: string;
  user?: User;
  projectId: string;
  parentCommentId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface ProjectCommentsProps {
  projectId: string;
  currentUserId: string;
}

const ProjectComments: React.FC<ProjectCommentsProps> = ({ projectId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/comments/project/${projectId}`);
      if (response.data.success) {
        setComments(response.data.comments);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchComments();
    }
  }, [projectId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await apiClient.post(`/comments/project/${projectId}`, {
        content: newComment
      });

      if (response.data.success) {
        setComments([response.data.comment, ...comments]);
        setNewComment('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) return;

    try {
      const response = await apiClient.post(`/comments/project/${projectId}/reply/${commentId}`, {
        content: replyContent
      });

      if (response.data.success) {
        fetchComments();
        setReplyingTo(null);
        setReplyContent('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post reply');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await apiClient.put(`/comments/${commentId}`, {
        content: editContent
      });

      if (response.data.success) {
        fetchComments();
        setEditingComment(null);
        setEditContent('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await apiClient.delete(`/comments/${commentId}`);

      if (response.data.success) {
        fetchComments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const getDisplayName = (user: User | undefined) => {
    if (!user) return 'Unknown User';
    if (user.displayPreference === 'username') {
      return `@${user.username}`;
    }
    return `${user.firstName} ${user.lastName}`;
  };

  const toggleCollapse = (commentId: string) => {
    const newCollapsed = new Set(collapsed);
    if (collapsed.has(commentId)) {
      newCollapsed.delete(commentId);
    } else {
      newCollapsed.add(commentId);
    }
    setCollapsed(newCollapsed);
  };

  const toggleExpandReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (expandedReplies.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const countReplies = (comment: Comment): number => {
    if (!comment.replies || comment.replies.length === 0) return 0;
    return comment.replies.reduce((acc, reply) => acc + 1 + countReplies(reply), 0);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isAuthor = comment.userId === currentUserId;
    const isEditing = editingComment === comment._id;
    const isCollapsed = collapsed.has(comment._id);
    const replyCount = countReplies(comment);
    const MAX_DEPTH = 8;
    const INDENT_PX = 24;
    const marginLeft = Math.min(depth, MAX_DEPTH) * INDENT_PX;

    const REPLIES_INITIAL = 5;
    const hasMany = comment.replies && comment.replies.length > REPLIES_INITIAL;
    const showAll = expandedReplies.has(comment._id);
    const visibleReplies = hasMany && !showAll
      ? comment.replies!.slice(0, REPLIES_INITIAL)
      : comment.replies || [];
    const hiddenCount = hasMany && !showAll ? comment.replies!.length - REPLIES_INITIAL : 0;

    return (
      <div key={comment._id} style={{ marginLeft: `${marginLeft}px` }} className="mt-3">
        <div className="rounded-xl p-4 bg-base-100 shadow-md hover:shadow-lg transition-shadow border-2 border-thick"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header - clickable to collapse */}
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer select-none"
              onClick={() => replyCount > 0 && toggleCollapse(comment._id)}
            >
              {comment.user?.isPublic || comment.user?.publicSlug ? (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 hover:bg-primary/25 transition-colors border-2 border-primary/40 border-thick"
                  onClick={(e) => {
                    e.stopPropagation();
                    const userSlug = comment.user?.publicSlug || comment.user?.username || comment.user?._id;
                    window.location.href = `/discover/user/${userSlug}`;
                  }}
                >
                  {getDisplayName(comment.user)}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 border-2 border-base-content/20 border-thick">
                  {getDisplayName(comment.user)}
                </span>
              )}
              <span className="text-xs text-base-content/50">•</span>
              <span className="text-xs text-base-content/50">
                {new Date(comment.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-base-content/50 italic">(edited)</span>
              )}
              {replyCount > 0 && (
                <>
                  <span className="text-xs text-base-content/50">•</span>
                  <span className="text-xs text-base-content/60 font-medium">
                    [{isCollapsed ? '+' : '−'}] {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                </>
              )}
            </div>

            {/* Content */}
            {!isCollapsed && (
              <>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="textarea textarea-bordered w-full text-sm border-thick"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={5000}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-xs btn-primary rounded-full border-thick"
                        onClick={() => handleEditComment(comment._id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-xs btn-ghost rounded-full border-thick"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words mb-2 leading-relaxed">{comment.content}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 text-xs">
                  <button
                    className="text-base-content/60 hover:text-base-content font-medium"
                    onClick={() => {
                      setReplyingTo(replyingTo === comment._id ? null : comment._id);
                      setReplyContent('');
                    }}
                  >
                    Reply
                  </button>
                  {isAuthor && !isEditing && (
                    <>
                      <button
                        className="text-base-content/60 hover:text-base-content font-medium"
                        onClick={() => {
                          setEditingComment(comment._id);
                          setEditContent(comment.content);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-base-content/60 hover:text-error font-medium"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment._id && !isCollapsed && (
          <div className="mt-3 space-y-2 p-3 bg-base-200/50 rounded-lg border-2 border-thick">
            <textarea
              className="textarea textarea-bordered w-full text-sm border-thick"
              rows={2}
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              maxLength={5000}
            />
            <div className="flex gap-2">
              <button
                className="btn btn-xs btn-primary rounded-full border-thick"
                onClick={() => handleReply(comment._id)}
              >
                Post Reply
              </button>
              <button
                className="btn btn-xs btn-ghost rounded-full border-thick"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

        {/* Nested replies */}
        {!isCollapsed && visibleReplies.length > 0 && (
          <div>
            {visibleReplies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}

        {/* Load more replies button */}
        {!isCollapsed && hiddenCount > 0 && (
          <div style={{ marginLeft: `${(Math.min(depth, MAX_DEPTH) + 1) * INDENT_PX}px` }} className="mt-2">
            <button
              className="text-xs text-base-content/60 hover:text-base-content font-medium"
              onClick={() => toggleExpandReplies(comment._id)}
            >
              Load {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}...
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {error && (
        <div className="alert alert-error shadow-md rounded-xl border-2 border-thick">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost rounded-full border-thick" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-2 p-4 bg-base-100 rounded-xl shadow-md border-2 border-thick">
        <textarea
          className="textarea textarea-bordered w-full border-thick"
          rows={3}
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={5000}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-base-content/60">{newComment.length}/5000</span>
          <button
            className="btn btn-primary btn-sm rounded-full border-thick"
            onClick={handlePostComment}
            disabled={!newComment.trim()}
          >
            Post Comment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-base-content/60 py-8">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div>
          {comments.map((comment) => renderComment(comment, 0))}
        </div>
      )}
    </div>
  );
};

export default ProjectComments;
