import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI } from '../api';
import type { TechOption, TechCategory } from '../data/techStackData';
import { STACK_CATEGORIES } from '../data/techStackData';
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
  const [editingVersion, setEditingVersion] = useState<{type: 'tech' | 'package', category: string, name: string, version: string} | null>(null);

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
      'database-orm': { tech: 'tooling', package: 'data' },
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
      const { techCategory, packageCategory } = getBackendCategory(category);
      
      // Try adding as technology first
      try {
        await projectAPI.addTechnology(selectedProject.id, {
          category: techCategory as any,
          name: tech.name,
          version: tech.latestVersion || ''
        });
      } catch (techErr: any) {
        // If that fails, try adding as package
        await projectAPI.addPackage(selectedProject.id, {
          category: packageCategory as any,
          name: tech.name,
          version: tech.latestVersion || '',
          description: tech.description
        });
      }
      
      // Track activity
      await activityTracker.trackCreate(
        'tech',
        'add-technology',
        tech.name,
        undefined,
        { category: techCategory, packageCategory }
      );
      
      onProjectRefresh();
    } catch (err: any) {
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
    if (!selectedProject) return false;
    
    // Check if this item exists by name in either technologies or packages
    // (regardless of category since backend categories might be different)
    const isInTech = selectedProject.selectedTechnologies?.some(tech => tech.name === name);
    const isInPackages = selectedProject.selectedPackages?.some(pkg => pkg.name === name);
    
    return isInTech || isInPackages;
  }, [selectedProject]);

  const handleUpdateVersion = useCallback(async (type: 'tech' | 'package', category: string, name: string, newVersion: string) => {
    if (!selectedProject) return;
    
    const loadingKey = `update-${category}-${name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      if (type === 'tech') {
        await projectAPI.updateTechnology(selectedProject.id, category, name, { version: newVersion });
      } else {
        await projectAPI.updatePackage(selectedProject.id, category, name, { version: newVersion });
      }
      
      // Track activity
      await activityTracker.trackUpdate(
        type,
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
      // Find the item in either list and remove it with the correct backend category
      const techItem = selectedProject.selectedTechnologies?.find(tech => tech.name === name);
      const packageItem = selectedProject.selectedPackages?.find(pkg => pkg.name === name);
      
      if (techItem) {
        await projectAPI.removeTechnology(selectedProject.id, techItem.category, name);
      } else if (packageItem) {
        await projectAPI.removePackage(selectedProject.id, packageItem.category, name);
      }
      onProjectRefresh();
    } catch (err: any) {
      handleAPIError(err, {
        component: 'StackPage',
        action: 'remove_technology',
        projectId: selectedProject.id
      });
      setError('Failed to remove item');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);

  // Memoize filtered categories for selected stack display
  const selectedTechsByCategory = useMemo(() => {
    if (!selectedProject?.selectedTechnologies) return {};
    return selectedProject.selectedTechnologies.reduce((acc, tech) => {
      if (!acc[tech.category]) acc[tech.category] = [];
      acc[tech.category].push(tech);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [selectedProject?.selectedTechnologies]);

  const selectedPackagesByCategory = useMemo(() => {
    if (!selectedProject?.selectedPackages) return {};
    return selectedProject.selectedPackages.reduce((acc, pkg) => {
      if (!acc[pkg.category]) acc[pkg.category] = [];
      acc[pkg.category].push(pkg);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [selectedProject?.selectedPackages]);

  // Memoize total count
  const totalSelectedCount = useMemo(() => {
    const techCount = selectedProject?.selectedTechnologies?.length || 0;
    const packageCount = selectedProject?.selectedPackages?.length || 0;
    return techCount + packageCount;
  }, [selectedProject?.selectedTechnologies?.length, selectedProject?.selectedPackages?.length]);

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
    type: 'tech' | 'package', 
    category: string, 
    name: string, 
    version?: string 
  }> = React.memo(({ type, category, name, version }) => {
    if (!version) return null;

    const isEditing = editingVersion?.type === type && editingVersion?.category === category && editingVersion?.name === name;
    const loadingKey = `update-${category}-${name}`;
    const isLoading = loadingStates[loadingKey];

    if (isEditing) {
      return (
        <input
          type="text"
          className="badge badge-xs badge-ghost px-2 py-1 text-xs font-mono bg-base-200 border border-primary/30 outline-none focus:ring-1 focus:ring-primary w-16 min-w-0"
          value={editingVersion.version}
          onChange={(e) => setEditingVersion(prev => prev ? { ...prev, version: e.target.value } : null)}
          onBlur={() => {
            if (editingVersion.version.trim() !== version) {
              handleUpdateVersion(type, category, name, editingVersion.version.trim());
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
        className="badge badge-xs badge-ghost cursor-pointer hover:bg-base-300 transition-colors h-5"
        onDoubleClick={() => setEditingVersion({ type, category, name, version })}
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
              className="badge badge-sm badge-ghost gap-1 px-3 py-2"
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
    if (!activeCategory && group.categories.length > 0) {
      setActiveCategory(group.categories[0].id);
    }

    const activeTab = group.categories.find(cat => cat.id === activeCategory);
    if (!activeTab) return null;

    return (
      <div className="space-y-4">
        {/* Category Navigation */}
        <div className="flex justify-center px-2">
          <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm max-w-full overflow-x-auto">
            {group.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`tab tab-sm min-h-10 font-bold text-sm whitespace-nowrap ${
                  activeCategory === category.id ? 'tab-active' : ''
                }`}
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
                      ? 'border-primary bg-primary/5 shadow-lg' 
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
                        className="font-semibold text-sm px-2 py-1 rounded-md bg-primary"
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
                  
                  <p className="text-xs text-base-content/70 leading-relaxed mb-3">
                    {option.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <PlatformBadge platforms={option.platforms} />
                    {option.latestVersion && (
                      <div className="badge badge-sm badge-outline px-3 py-2">
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
        <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'add' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('add')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Technologies</span>
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'current' ? 'tab-active' : ''}`}
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
              {Object.entries(selectedTechsByCategory).map(([categoryId, techs]) => {
                if (!techs?.length) return null;
                const category = stackCategories.find(c => c.id === categoryId) || {
                  id: categoryId,
                  name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
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
                          <div className="flex items-center gap-2 mb-2">
                            <h3 
                              className="font-semibold px-2 py-1 rounded-md bg-primary inline-block"
                              style={{ color: getContrastTextColor() }}
                            >
                              {tech.name}
                            </h3>
                            <VersionBadge 
                              type="tech" 
                              category={tech.category} 
                              name={tech.name} 
                              version={tech.version} 
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{category.emoji}</span>
                            <p className="text-xs text-base-content/60">{category.name}</p>
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
              
              {/* Packages */}
              {Object.entries(selectedPackagesByCategory).map(([categoryId, packages]) => {
                if (!packages?.length) return null;
                const category = stackCategories.find(c => c.id === categoryId) || {
                  id: categoryId,
                  name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                  emoji: '📦',
                  color: '#6B7280',
                  description: '',
                  options: []
                };
                
                return packages.map((pkg) => {
                  const loadingKey = `remove-${pkg.category}-${pkg.name}`;
                  const isLoading = loadingStates[loadingKey];
                  const pkgOption = techOptionsLookup.get(pkg.name);
                  
                  return (
                    <div
                      key={`${categoryId}-${pkg.name}`}
                      className="card-interactive group cursor-default p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base-content group-hover:text-primary transition-colors duration-200 px-2 py-1 rounded-md bg-base-300 inline-block">
                              {pkg.name}
                            </h3>
                            <VersionBadge 
                              type="package" 
                              category={pkg.category} 
                              name={pkg.name} 
                              version={pkg.version} 
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{category.emoji}</span>
                            <p className="text-xs text-base-content/60">{category.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pkgOption?.url && (
                            <a
                              href={pkgOption.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm text-primary hover:bg-primary/10 border-2 border-base-content/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View documentation"
                            >
                              🔗
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveTechnology(pkg.category, pkg.name)}
                            className={`btn btn-ghost btn-sm text-error hover:bg-error/10 border border-base-content/20 opacity-0 group-hover:opacity-100 transition-opacity ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                          >
                            {isLoading ? '' : '×'}
                          </button>
                        </div>
                      </div>
                      {pkgOption?.description && (
                        <p className="text-sm text-base-content/70">
                          {pkgOption.description}
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
                        <span className="font-medium text-xs">{platform.name}</span>
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
                    >
                      <div className="font-medium text-xs">{group.name}</div>
                      <div className="text-xs text-base-content/60 mt-0.5 leading-tight">{group.description}</div>
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