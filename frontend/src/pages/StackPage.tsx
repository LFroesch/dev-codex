import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI } from '../api';
import type { TechOption, TechCategory } from '@shared/data/techStackData';
import { STACK_CATEGORIES } from '@shared/data/techStackData';
import { handleAPIError } from '../services/errorService';
import activityTracker from '../services/activityTracker';
import { getContrastTextColor } from '../utils/contrastTextColor';

type PlatformType = 'web' | 'mobile' | 'desktop';

const PLATFORMS: { id: PlatformType; name: string; emoji: string; color: string }[] = [
  { id: 'web', name: 'Web', emoji: '🌐', color: '#3B82F6' },
  { id: 'mobile', name: 'Mobile', emoji: '📱', color: '#EF4444' },
  { id: 'desktop', name: 'Desktop', emoji: '💻', color: '#10B981' },
];

interface ContextType {
  selectedProject: Project | null;
  user: any;
  onProjectRefresh: () => Promise<void>;
}

const StackPage: React.FC = () => {
  const { selectedProject, user, onProjectRefresh } = useOutletContext<ContextType>();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(() => new Set(['web', 'mobile', 'desktop']));
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [stackCategories, setStackCategories] = useState<TechCategory[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<'current' | 'add'>('current');
  const [selectedGroup, setSelectedGroup] = useState<string>('Frontend');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [editingVersion, setEditingVersion] = useState<{category: string, name: string, version: string} | null>(null);

  // Local state for instant UI updates - unified stack
  const [localStack, setLocalStack] = useState<any[]>([]);

  // Load tech stack data and set up activity tracking
  useEffect(() => {
    if (!dataLoaded) {
      setStackCategories(STACK_CATEGORIES);
      setDataLoaded(true);
    }

    // Set activity tracker context when project changes
    if (selectedProject && user) {
      activityTracker.setContext(selectedProject.id, user.id);
    }
  }, [dataLoaded, selectedProject, user]);

  // Sync local state from selectedProject (server is source of truth)
  useEffect(() => {
    if (selectedProject) {
      setLocalStack(selectedProject.stack || []);
    }
  }, [selectedProject?.stack]);

  // Map frontend categories to valid backend categories
  const getBackendCategory = (frontendCategory: string): { techCategory: string, packageCategory: string } => {
    const categoryMap: { [key: string]: { tech: string, package: string } } = {
      'frontend-framework': { tech: 'framework', package: 'ui' },
      'meta-framework': { tech: 'framework', package: 'ui' },
      'ui-library': { tech: 'framework', package: 'ui' },
      'styling': { tech: 'styling', package: 'ui' },
      'backend-language': { tech: 'runtime', package: 'api' },
      'backend-framework': { tech: 'framework', package: 'api' },
      'database': { tech: 'database', package: 'data' },
      'database-orm': { tech: 'database', package: 'data' },
      'mobile-framework': { tech: 'framework', package: 'ui' },
      'desktop-framework': { tech: 'framework', package: 'ui' },
      'hosting-deployment': { tech: 'deployment', package: 'utility' },
      'development-tools': { tech: 'tooling', package: 'utility' },
      'testing': { tech: 'testing', package: 'utility' },
      'authentication': { tech: 'tooling', package: 'auth' },
      'payments': { tech: 'tooling', package: 'utility' },
      'email': { tech: 'tooling', package: 'api' },
      'file-storage': { tech: 'tooling', package: 'data' },
      'analytics': { tech: 'tooling', package: 'data' },
      'monitoring': { tech: 'tooling', package: 'utility' },
      'cms': { tech: 'tooling', package: 'data' },
      'state-management': { tech: 'tooling', package: 'state' },
      'data-fetching': { tech: 'tooling', package: 'api' },
      'forms': { tech: 'tooling', package: 'forms' },
      'routing': { tech: 'tooling', package: 'routing' },
      'animation': { tech: 'tooling', package: 'animation' },
      'utilities': { tech: 'tooling', package: 'utility' }
    };

    const mapping = categoryMap[frontendCategory] || { tech: 'tooling', package: 'utility' };
    return { techCategory: mapping.tech, packageCategory: mapping.package };
  };

  const handleAddTechnology = useCallback(async (category: string, tech: TechOption) => {
    if (!selectedProject) return;

    const loadingKey = `add-${category}-${tech.name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      const { techCategory } = getBackendCategory(category);

      // OPTIMISTIC UPDATE - Add to local state immediately
      const newItem = {
        category: techCategory,
        name: tech.name,
        version: tech.latestVersion || '',
        description: tech.description || ''
      };
      setLocalStack(prev => [...prev, newItem]);

      // Add to unified stack via technology endpoint
      await projectAPI.addTechnology(selectedProject.id, {
        category: techCategory as any,
        name: tech.name,
        version: tech.latestVersion || '',
        description: tech.description
      });

      // Track activity
      await activityTracker.trackCreate(
        'tech',
        'add-technology',
        tech.name,
        undefined,
        { category: techCategory }
      );

      await onProjectRefresh();
    } catch (err: any) {
      // Rollback optimistic update on error
      setLocalStack(prev => prev.filter(item => item.name !== tech.name));

      handleAPIError(err, {
        component: 'StackPage',
        action: 'add_technology',
        projectId: selectedProject.id
      });
      setError(err.response?.data?.message || 'Failed to add item');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);


  const isSelected = useCallback((name: string) => {
    // Check if this item exists by name in the unified stack
    return localStack?.some(item => item.name === name);
  }, [localStack]);

  const handleUpdateVersion = useCallback(async (category: string, name: string, newVersion: string) => {
    if (!selectedProject) return;

    const loadingKey = `update-${category}-${name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      await projectAPI.updateTechnology(selectedProject.id, category, name, { version: newVersion });

      // Track activity
      await activityTracker.trackUpdate(
        'tech',
        'update-version',
        name,
        undefined,
        { category, oldVersion: editingVersion?.version, newVersion }
      );

      onProjectRefresh();
      setEditingVersion(null);
    } catch (err: any) {
      handleAPIError(err, {
        component: 'StackPage',
        action: 'update_version',
        projectId: selectedProject.id
      });
      setError('Failed to update version');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh, editingVersion]);

  const handleRemoveTechnology = useCallback(async (category: string, name: string) => {
    if (!selectedProject) return;

    const loadingKey = `remove-${category}-${name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      // Find in local state and remove immediately for instant UI update
      const stackItem = localStack?.find(item => item.name === name);

      if (stackItem) {
        // OPTIMISTIC UPDATE - Remove from local state immediately
        setLocalStack(prev => prev.filter(item => item.name !== name));
        await projectAPI.removeTechnology(selectedProject.id, stackItem.category, name);
        await onProjectRefresh();
      } else {
        // Item not found - shouldn't happen but handle it
        setError(`Item "${name}" not found in project`);
        setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
        return;
      }
    } catch (err: any) {
      handleAPIError(err, {
        component: 'StackPage',
        action: 'remove_technology',
        projectId: selectedProject.id
      });
      setError('Failed to remove item');
      // Refresh will re-sync from server if API failed
      await onProjectRefresh();
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh, localStack]);

  // Memoize filtered categories for selected stack display
  const selectedStackByCategory = useMemo(() => {
    if (!localStack) return {};
    return localStack.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [localStack]);

  // Memoize total count
  const totalSelectedCount = useMemo(() => {
    return localStack?.length || 0;
  }, [localStack]);

  // Filter categories based on selected platforms
  const filteredCategories = useMemo(() => {
    return stackCategories.map(category => ({
      ...category,
      options: category.options.filter(option => 
        !option.platforms || option.platforms.some(platform => selectedPlatforms.has(platform))
      )
    })).filter(category => category.options.length > 0);
  }, [stackCategories, selectedPlatforms]);

  // Create a lookup map for quick tech option access
  const techOptionsLookup = useMemo(() => {
    const map = new Map();
    filteredCategories.forEach(category =>
      category.options.forEach(option => 
        map.set(option.name, option)
      )
    );
    return map;
  }, [filteredCategories]);

  const handlePlatformToggle = useCallback((platform: PlatformType) => {
    setSelectedPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  }, []);

  const VersionBadge: React.FC<{
    category: string,
    name: string,
    version?: string
  }> = React.memo(({ category, name, version }) => {
    if (!version) return null;

    const isEditing = editingVersion?.category === category && editingVersion?.name === name;
    const loadingKey = `update-${category}-${name}`;
    const isLoading = loadingStates[loadingKey];

    if (isEditing) {
      return (
        <input
          type="text"
          className="badge badge-xs badge-ghost h-6 w-20 border-2 border-primary/20 px-2 py-1 text-xs font-mono cursor-pointer select-none"
          value={editingVersion.version}
          onChange={(e) => setEditingVersion(prev => prev ? { ...prev, version: e.target.value } : null)}
          onBlur={() => {
            if (editingVersion.version.trim() !== version) {
              handleUpdateVersion(category, name, editingVersion.version.trim());
            } else {
              setEditingVersion(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setEditingVersion(null);
            }
          }}
          autoFocus
          disabled={isLoading}
        />
      );
    }

    return (
      <span
        className="badge badge-xs badge-ghost h-6 border-2 border-base-content/20 px-2 py-1 text-xs font-mono cursor-pointer select-none"
        onDoubleClick={() => setEditingVersion({ category, name, version })}
        title="Double-click to edit version"
      >
        v{version}
      </span>
    );
  });

  const PlatformBadge: React.FC<{ platforms?: PlatformType[] }> = React.memo(({ platforms }) => {
    if (!platforms || platforms.length === 0) return null;
    
    return (
      <div className="flex gap-2 flex-wrap">
        {platforms.map(platform => {
          const platformConfig = PLATFORMS.find(p => p.id === platform);
          if (!platformConfig) return null;
          return (
            <div
              key={platform}
              className="badge badge-sm badge-ghost gap-1 px-3 py-2 h-[1.5rem] flex items-center border-2 border-base-content/20"
            >
              <span>{platformConfig.emoji}</span>
              {platformConfig.name}
            </div>
          );
        })}
      </div>
    );
  });

  const categoryGroups = useMemo(() => {
    const groups = {
      'Frontend': {
        description: 'Frontend frameworks, UI libraries, and styling',
        categories: ['frontend-framework', 'meta-framework', 'ui-library', 'styling']
      },
      'Backend': {
        description: 'Server languages, frameworks, and databases',
        categories: ['backend-language', 'backend-framework', 'database', 'database-orm']
      },
      'Platforms': {
        description: 'Mobile and desktop development',
        categories: ['mobile-framework', 'desktop-framework']
      },
      'Infrastructure': {
        description: 'Hosting, development tools, and testing',
        categories: ['hosting-deployment', 'development-tools', 'testing']
      },
      'Services': {
        description: 'Authentication, payments, and third-party APIs',
        categories: ['authentication', 'payments', 'email', 'file-storage', 'analytics', 'monitoring', 'cms']
      },
      'Libraries': {
        description: 'State management, data fetching, and utilities',
        categories: ['state-management', 'data-fetching', 'forms', 'routing', 'animation', 'utilities']
      }
    };

    const result = Object.entries(groups).map(([groupName, groupData]) => ({
      name: groupName,
      description: groupData.description,
      categories: filteredCategories.filter(cat => groupData.categories.includes(cat.id))
    })).filter(group => group.categories.length > 0);
    
    return result;
  }, [filteredCategories]);

  const TechOptionsDisplay: React.FC = React.memo(() => {
    const group = categoryGroups.find(g => g.name === selectedGroup);
    if (!group) return null;

    // Auto-select first category if none selected
    useEffect(() => {
      if (!activeCategory && group.categories.length > 0) {
        setActiveCategory(group.categories[0].id);
      }
    }, [activeCategory, group.categories]);

    const activeTab = group.categories.find(cat => cat.id === activeCategory);
    if (!activeTab) return null;

    return (
      <div className="space-y-4">
        {/* Category Navigation */}
        <div className="flex justify-center px-2">
          <div className="tabs-container p-1 max-w-full overflow-x-auto">
            {group.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`tab-button whitespace-nowrap ${
                  activeCategory === category.id ? 'tab-active' : ''
                }`}
                style={activeCategory === category.id ? {color: getContrastTextColor()} : {}}
              >
                <span>{category.emoji}</span>
                <span className="ml-2">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Category Options */}
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">
                <span className="text-xl">{activeTab.emoji}</span>
              </div>
              <div>
                <h3 className="font-semibold">{activeTab.name}</h3>
                <p className="text-sm text-base-content/60 mt-1">{activeTab.description}</p>
              </div>
            </div>
          </div>
          <div className="section-content">
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTab.options.map((option) => {
              const selected = isSelected(option.name);
              const loadingKey = selected 
                ? `remove-${activeTab.id}-${option.name}`
                : `add-${activeTab.id}-${option.name}`;
              const isLoading = loadingStates[loadingKey];

              return (
                <div
                  key={option.name}
                  className={`card-interactive group cursor-pointer p-4 ${
                    selected 
                      ? 'border-primary bg-primary/35 shadow-lg' 
                      : ''
                  } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  onClick={() => {
                    if (isLoading) return;
                    if (selected) {
                      handleRemoveTechnology(activeTab.id, option.name);
                    } else {
                      handleAddTechnology(activeTab.id, option);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4
                        className="font-semibold text-sm px-2 py-1 rounded-md bg-primary border-thick"
                        style={{ color: getContrastTextColor() }}
                      >
                        {option.name}
                      </h4>
                      {option.url && (
                        <a
                          href={option.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost w-8 btn-sm text-primary hover:bg-primary/10 border-2 border-base-content/20 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          title="View documentation"
                        >
                          🔗
                        </a>
                      )}
                    </div>
                    <div>
                      {isLoading ? (
                        <div className="loading loading-spinner loading-sm"></div>
                      ) : selected ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-base-300 flex items-center justify-center hover:border-primary transition-colors">
                          <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-base-content/80 leading-relaxed mb-3"
                  style={{ color : selected ? getContrastTextColor() : undefined }}>
                    {option.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <PlatformBadge platforms={option.platforms} />
                    {option.latestVersion && (
                      <div className="badge badge-xs badge-ghost h-6 border-2 border-base-content/20 px-2 py-1 text-xs font-mono cursor-pointer select-none">
                        v{option.latestVersion}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
        </div>
    );
  });

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view tech stack and progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex justify-center px-2">
        <div className="tabs-container p-1">
          <button 
            className={`tab-button ${activeSection === 'add' ? 'tab-active' : ''}`}
            style={activeSection === 'add' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('add')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Technologies</span>
          </button>
          <button 
            className={`tab-button ${activeSection === 'current' ? 'tab-active' : ''}`}
            style={activeSection === 'current' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('current')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Current Stack <span className="text-xs opacity-70">({totalSelectedCount})</span></span>
          </button>
        </div>
      </div>

      {/* Current Stack Section */}
      {activeSection === 'current' && (
        <div className="space-y-6">
          {totalSelectedCount === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-base-content/80">No technologies selected</h3>
              <p className="text-sm text-base-content/60">Add technologies to your stack to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Technologies */}
              {(Object.entries(selectedStackByCategory) as [string, any[]][]).map(([categoryId, techs]) => {
                if (!techs?.length) return null;
                const category = stackCategories.find(c => c.id === categoryId) || {
                  id: categoryId,
                  name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                  shortName: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                  emoji: '🔧',
                  color: '#6B7280',
                  description: '',
                  options: []
                };
                
                return techs.map((tech) => {
                  const loadingKey = `remove-${tech.category}-${tech.name}`;
                  const isLoading = loadingStates[loadingKey];
                  const techOption = techOptionsLookup.get(tech.name);
                  
                  return (
                    <div
                      key={`${categoryId}-${tech.name}`}
                      className="card-interactive group cursor-default p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                            <h3
                              className="font-semibold px-2 py-1 rounded-md bg-primary inline-block w-fit border-thick"
                              style={{ color: getContrastTextColor() }}
                            >
                              {tech.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <VersionBadge
                                category={tech.category}
                                name={tech.name}
                                version={tech.version}
                              />
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-base-200/50 border-2 border-base-content/10">
                                <p className="text-xs text-base-content/70">{category.shortName}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {techOption?.url && (
                            <a
                              href={techOption.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost w-8 btn-sm text-primary hover:bg-primary/10 border-2 border-base-content/20 group-hover:opacity-100 transition-opacity"
                              title="View documentation"
                            >
                              🔗
                            </a>
                            )}
                          <button
                            onClick={() => handleRemoveTechnology(tech.category, tech.name)}
                            className={`btn w-8 btn-ghost btn-sm text-error hover:bg-error/10 border-2 border-base-content/20 group-hover:opacity-100 transition-opacity ${isLoading ? 'loading' : ''}`}
                            title='Remove technology'
                            disabled={isLoading}
                          >
                            {isLoading ? '' : '×'}
                          </button>
                        </div>
                      </div>
                      {techOption?.description && (
                        <p className="text-sm text-base-content/70">
                          {techOption.description}
                        </p>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Technologies Section */}
      {activeSection === 'add' && (
        <div className="space-y-6">
          {/* Combined Selection Panel */}
          <div className="section-container mb-4">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-icon">
                  🎯
                </div>
                <span>Target Platforms & Category Groups</span>
              </div>
            </div>
            <div className="section-content">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Platform Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Target Platforms
                  </h3>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformToggle(platform.id)}
                      className={`text-left p-2 rounded-md border-2 transition-all duration-200 hover:shadow-md ${
                        selectedPlatforms.has(platform.id)
                          ? 'border-primary bg-primary/50 shadow-sm'
                          : 'border-base-300 hover:border-primary/30 bg-base-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{platform.emoji}</span>
                        <span className="font-medium text-xs"
                        style={{ color: selectedPlatforms.has(platform.id) ? getContrastTextColor() : undefined }}
                        >{platform.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Technology Categories Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  Category Groups
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {categoryGroups.map((group) => (
                    <button
                      key={group.name}
                      onClick={() => {
                        setSelectedGroup(group.name);
                        setActiveCategory(''); // Reset active category when group changes
                      }}
                      className={`text-left p-2 rounded-md border-2 transition-all duration-200 hover:shadow-md ${
                        selectedGroup === group.name
                          ? 'border-primary bg-primary/50 shadow-sm'
                          : 'border-base-300 hover:border-primary/30 bg-base-200'
                      }`}
                      style={{ color: selectedGroup === group.name ? getContrastTextColor() : undefined }}
                    >
                      <div className="font-medium text-xs">{group.name}</div>
                      <div className="text-xs text-base-content/60 mt-0.5 leading-tight"
                      style={{ color: selectedGroup === group.name ? getContrastTextColor() : undefined }}
                      >
                        {group.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Technology Options */}
          {selectedGroup && (
            <div>
              <TechOptionsDisplay />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StackPage;