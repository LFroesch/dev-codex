import React, { useState, useEffect } from 'react';
import { newsAPI } from '../api';

interface NewsPost {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'news' | 'update' | 'dev_log' | 'announcement';
  isPublished: boolean;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

const NewsPage: React.FC = () => {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'news' | 'update' | 'dev_log' | 'announcement'>('all');

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
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
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
      case 'news': return '📰';
      case 'update': return '🔄';
      case 'dev_log': return '👩‍💻';
      case 'announcement': return '📢';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dev_log': return 'Dev Log';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const filteredPosts = posts.filter(post => 
    activeSection === 'all' || post.type === activeSection
  );

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
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">📰</div>
        <h2 className="text-2xl font-bold mb-2">What's New?</h2>
        <p className="text-base-content/60">Latest updates and announcements</p>
      </div>

      {/* Category Navigation */}
      <div className="flex justify-center">
        <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90">
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('all')}
          >
            All <span className="text-xs opacity-70">({posts.length})</span>
          </button>
          {(['news', 'update', 'dev_log', 'announcement'] as const).map((type) => {
            const count = posts.filter(p => p.type === type).length;
            if (count === 0) return null;
            
            return (
              <button 
                key={type}
                className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === type ? 'tab-active' : ''}`}
                onClick={() => setActiveSection(type)}
              >
                {getTypeIcon(type)} {getTypeLabel(type)} <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
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
              className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer group h-48 flex flex-col"
              onClick={() => handlePostClick(post)}
            >
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-base-content group-hover:text-primary transition-colors duration-200 truncate px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
                    {getTypeIcon(post.type)} {post.title}
                  </h3>
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {post.summary && (
                  <p className="text-sm text-base-content/60 mb-2 line-clamp-1">
                    {post.summary}
                  </p>
                )}
                
                <div 
                  className="text-sm text-base-content/70 mb-3 line-clamp-3 flex-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content.substring(0, 200) + '...', true) }}
                />
                
                <div className="flex items-center justify-between text-xs text-base-content/50 pt-3 mt-auto">
                  <span>{getTypeLabel(post.type)}</span>
                  <span>{new Date(post.publishedAt!).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal - using same pattern as NoteModal */}
      {selectedPost && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 ${isModalOpen ? 'scale-100' : 'scale-95'}`}>
            <div className="flex justify-between items-center p-6 border-b border-base-300">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getTypeIcon(selectedPost.type)}</span>
                <div>
                  <h2 className="text-xl font-bold">{selectedPost.title}</h2>
                  <p className="text-sm text-base-content/60">
                    {getTypeLabel(selectedPost.type)} • {new Date(selectedPost.publishedAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-ghost btn-circle"
                onClick={handleCloseModal}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedPost.summary && (
                <p className="text-base-content/80 mb-4 italic bg-base-200 p-3 rounded-lg">
                  {selectedPost.summary}
                </p>
              )}
              <div 
                className="text-base-content/70 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedPost.content) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;