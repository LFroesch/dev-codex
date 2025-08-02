import React, { useState } from 'react';

interface PublicProject {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: string;
  createdAt: string;
  liveUrl?: string;
  githubUrl?: string;
  banner?: string;
  likes: number;
  views: number;
}

const DiscoverPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');

  // Mock data for demonstration - this would come from an API
  const mockProjects: PublicProject[] = [
    {
      id: '1',
      name: 'TaskFlow - Project Management Tool',
      description: 'A modern project management application built with React and Node.js. Features include real-time collaboration, task tracking, and team management.',
      tags: ['React', 'Node.js', 'MongoDB', 'WebSocket'],
      author: 'John Developer',
      createdAt: '2024-01-15',
      liveUrl: 'https://taskflow-demo.com',
      githubUrl: 'https://github.com/johndeveloper/taskflow',
      likes: 245,
      views: 1832,
    },
    {
      id: '2',
      name: 'E-Commerce Dashboard',
      description: 'Full-stack e-commerce analytics dashboard with real-time sales tracking, inventory management, and customer insights.',
      tags: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind'],
      author: 'Sarah Chen',
      createdAt: '2024-01-10',
      liveUrl: 'https://ecommerce-dash.com',
      likes: 189,
      views: 1456,
    },
    {
      id: '3',
      name: 'AI Content Generator',
      description: 'AI-powered content generation tool using OpenAI API. Generate blog posts, social media content, and marketing copy.',
      tags: ['Python', 'FastAPI', 'OpenAI', 'Vue.js'],
      author: 'Mike Johnson',
      createdAt: '2024-01-05',
      githubUrl: 'https://github.com/mikej/ai-content-gen',
      likes: 312,
      views: 2143,
    },
  ];

  const categories = ['all', 'web-app', 'mobile', 'ai-ml', 'tool', 'game', 'other'];

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filtering would be implemented based on project categories
    const matchesCategory = selectedCategory === 'all'; // Simplified for demo
    
    return matchesSearch && matchesCategory;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likes - a.likes;
      case 'trending':
        return b.views - a.views;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-lg border-b border-base-content/10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Discover Projects</h1>
              <p className="text-base-content/60 mt-1">Explore public projects from the community</p>
            </div>
            <div className="badge badge-warning">Coming Soon</div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects, technologies, or creators..."
                  className="input input-bordered w-full pl-10 pr-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <select
              className="select select-bordered"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="web-app">Web Apps</option>
              <option value="mobile">Mobile Apps</option>
              <option value="ai-ml">AI/ML</option>
              <option value="tool">Tools</option>
              <option value="game">Games</option>
              <option value="other">Other</option>
            </select>

            <select
              className="select select-bordered"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recent">Recently Added</option>
              <option value="popular">Most Liked</option>
              <option value="trending">Most Viewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Coming Soon Notice */}
        <div className="card bg-gradient-to-r from-warning/10 to-info/10 border border-warning/20 mb-8">
          <div className="card-body text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Community Discovery Coming Soon!</h2>
            <p className="text-base-content/70 mb-4">
              We're building an amazing way for you to discover and share projects with the community. 
              Features will include project browsing, favoriting, following creators, and more!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <div className="badge badge-outline">🔍 Project Search</div>
              <div className="badge badge-outline">❤️ Like & Favorite</div>
              <div className="badge badge-outline">👥 Follow Creators</div>
              <div className="badge badge-outline">🏷️ Tag Filtering</div>
              <div className="badge badge-outline">📊 Trending Projects</div>
            </div>
          </div>
        </div>

        {/* Mock Project Grid (for demonstration) */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Preview: What You'll See</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProjects.map((project) => (
              <div key={project.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow opacity-60">
                <div className="card-body">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="card-title text-lg">{project.name}</h3>
                    <div className="badge badge-ghost">Preview</div>
                  </div>
                  
                  <p className="text-base-content/70 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge badge-primary badge-sm">
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="badge badge-ghost badge-sm">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm text-base-content/60 mb-4">
                    <span>by {project.author}</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-sm text-base-content/60">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {project.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {project.views}
                      </span>
                    </div>
                    
                    <div className="flex gap-1">
                      {project.liveUrl && (
                        <button className="btn btn-primary btn-xs" disabled>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      )}
                      {project.githubUrl && (
                        <button className="btn btn-ghost btn-xs" disabled>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Preview */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title mb-4">🚀 Planned Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Advanced Search & Filtering</h4>
                    <p className="text-sm text-base-content/60">Filter by technology stack, project type, and complexity level</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Community Features</h4>
                    <p className="text-sm text-base-content/60">Like, comment, and follow your favorite creators</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Trending & Featured</h4>
                    <p className="text-sm text-base-content/60">Discover what's popular and featured projects</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Collections & Lists</h4>
                    <p className="text-sm text-base-content/60">Curate your own project collections and discover others</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Project Analytics</h4>
                    <p className="text-sm text-base-content/60">See views, likes, and engagement for your public projects</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-medium">Collaboration Tools</h4>
                    <p className="text-sm text-base-content/60">Connect with other developers and collaborate on projects</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;