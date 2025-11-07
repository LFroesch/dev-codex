import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { newsAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { useItemModal } from '../hooks/useItemModal';

interface NewsPost {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished: boolean;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

const NewsPage: React.FC = () => {
  const { activeNewsTab } = useOutletContext<any>();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Modal state using custom hook
  const postModal = useItemModal<NewsPost>({ initialMode: 'view' });

  const isRecent = (date: string) => {
    const postDate = new Date(date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return postDate >= sevenDaysAgo;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await newsAPI.getPublished();
        setPosts(response.posts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handlePostClick = (post: NewsPost) => {
    postModal.open(post, 'view');
  };

  // Enhanced markdown to HTML converter (same as EnhancedTextEditor)
  const renderMarkdown = (text: string, isPreview = false): string => {
    if (!text) return '<p class="text-base-content/60 italic">Nothing to preview yet...</p>';
    
    let processedText = text;
    
    // Helper function to ensure URL has protocol
    const ensureProtocol = (url: string): string => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return 'https://' + url;
    };
    
    // Process in order to avoid conflicts
    
    // 1. Headers - remove top margin for previews
    const headerMargin = isPreview ? 'mt-1' : 'mt-4';
    processedText = processedText
      .replace(/^### (.*$)/gim, `<h3 class="text-lg font-semibold ${headerMargin} mb-2">$1</h3>`)
      .replace(/^## (.*$)/gim, `<h2 class="text-xl font-semibold ${headerMargin} mb-2">$1</h2>`)
      .replace(/^# (.*$)/gim, `<h1 class="text-2xl font-bold ${headerMargin} mb-2">$1</h1>`);
    
    // 2. Code blocks (must come before inline code and links)
    processedText = processedText
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 3. Markdown-style links [text](url) - process before auto-linking
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_, text, url) => {
      const fullUrl = ensureProtocol(url);
      return `<a href="${fullUrl}" class="link link-primary" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // 4. Auto-detect plain URLs
    const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<>"']+)/gi;
    processedText = processedText.replace(urlRegex, '<a href="$1" class="link link-primary" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 5. Bold and italic (must come after links to avoid conflicts)
    processedText = processedText
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em class="font-bold italic">$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
      .replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/gim, '<em class="italic">$1</em>');
    
    // 6. Lists
    processedText = processedText
      .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');
    
    // 7. Line breaks and paragraphs
    processedText = processedText
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br/>');
    
    // 8. Wrap in paragraph tags if not already wrapped
    if (!processedText.includes('<p') && !processedText.includes('<h') && !processedText.includes('<pre')) {
      processedText = `<p class="mb-2">${processedText}</p>`;
    }
    
    return processedText;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'news': return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
        </svg>
      );
      case 'update': return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
      case 'dev_log': return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
      case 'announcement': return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
      case 'important': return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dev_log': return 'Dev Log';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const filteredPosts = posts
    .filter(post => activeNewsTab === 'all' || post.type === activeNewsTab)
    .sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.createdAt).getTime();
      const dateB = new Date(b.publishedAt || b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-md">
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sort Controls */}
      <div className="text-center">
        <div className="text-6xl mb-4">📰</div>
        <h2 className="text-2xl font-bold mb-2">What's New?</h2>
        <p className="text-base-content/60 mb-4">Latest updates and announcements</p>

        {/* Sort Controls */}
        {posts.length > 0 && (
          <div className="flex justify-center items-center gap-2">
            <span className="text-sm text-base-content/60">Sort by:</span>
            <div className="join">
              <button
                className={`btn btn-xs join-item ${sortBy === 'newest' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setSortBy('newest')}
              >
                Newest First
              </button>
              <button
                className={`btn btn-xs join-item ${sortBy === 'oldest' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setSortBy('oldest')}
              >
                Oldest First
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-base-content/80">No posts available</h3>
          <p className="text-sm text-base-content/60">Check back later for updates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div 
              key={post._id}
              className="shadow-md p-4 rounded-lg border-2 border-base-content/20 hover:border-base-300/50 transition-all duration-200 cursor-pointer group h-48 flex flex-col"
              onClick={() => handlePostClick(post)}
            >
              <div className="flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="border-2 border-base-content/20 font-semibold truncate px-2 py-1 rounded-md group-hover:opacity-90 transition-opacity bg-primary inline-block"
                       style={{ color: getContrastTextColor() }}>
                      {getTypeIcon(post.type)} {post.title}
                    </h3>
                    {isRecent(post.publishedAt || post.createdAt) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-error text-error-content animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {post.summary && (
                  <div className="inline-flex items-start px-2 py-0.5 rounded-md text-xs font-medium text-base-content/80 border-2 border-base-content/20 h-fit w-full bg-base-200 mb-2">
                    <p className="text-sm text-base-content/70 line-clamp-1">
                      {post.summary}
                    </p>
                  </div>
                )}
                
                <div 
                  className="text-sm text-base-content/70 mb-3 line-clamp-3 flex-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content.substring(0, 200) + '...', true) }}
                />
                
                <div className="flex items-center justify-between text-xs pt-3 border-t-2 border-base-content/20 mt-auto">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-success/80 text-base-content/80 border-2 border-base-content/20"
                       style={{ color: getContrastTextColor("success") }}>
                    {getTypeLabel(post.type)}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-base-200 text-base-content/80 border-2 border-base-content/20 font-mono">
                    {new Date(post.publishedAt!).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal - using same pattern as NoteModal */}
      {postModal.item && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${postModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 ${postModal.isOpen ? 'scale-100' : 'scale-95'}`}>
            <div className="flex justify-between items-center p-6 border-b border-base-300">
              <div className="flex items-center gap-3">
                <div className="text-lg">
                  {React.cloneElement(getTypeIcon(postModal.item.type) as React.ReactElement, {
                    className: "w-5 h-5 inline"
                  })}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{postModal.item.title}</h2>
                  <p className="text-sm text-base-content/60">
                    {getTypeLabel(postModal.item.type)} • {new Date(postModal.item.publishedAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-circle"
                onClick={postModal.close}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {postModal.item.summary && (
                <p className="text-base-content/80 mb-4 italic bg-base-200 p-3 rounded-lg">
                  {postModal.item.summary}
                </p>
              )}
              <div
                className="text-base-content/70 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(postModal.item.content) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;