import React, { useState, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI } from '../api';
import { STACK_CATEGORIES, TechCategory, TechOption } from '../data/techStackData';

type PlatformType = 'web' | 'mobile' | 'desktop';

const PLATFORMS: { id: PlatformType; name: string; emoji: string; color: string }[] = [
  { id: 'web', name: 'Web', emoji: '🌐', color: '#3B82F6' },
  { id: 'mobile', name: 'Mobile', emoji: '📱', color: '#EF4444' },
  { id: 'desktop', name: 'Desktop', emoji: '💻', color: '#10B981' },
];

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const StackPage: React.FC = () => {
  const { selectedProject, onProjectRefresh } = useOutletContext<ContextType>();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(new Set(['web', 'mobile', 'desktop']));
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

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
      await onProjectRefresh();
    } catch (err: any) {
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
      await onProjectRefresh();
    } catch (err) {
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
    return STACK_CATEGORIES.map(category => ({
      ...category,
      options: category.options.filter(option => 
        !option.platforms || option.platforms.some(platform => selectedPlatforms.has(platform))
      )
    })).filter(category => category.options.length > 0);
  }, [selectedPlatforms]);

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
      'Core': {
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

    return Object.entries(groups).map(([groupName, groupData]) => ({
      name: groupName,
      description: groupData.description,
      categories: filteredCategories.filter(cat => groupData.categories.includes(cat.id))
    })).filter(group => group.categories.length > 0);
  }, [filteredCategories]);

  const [selectedGroup, setSelectedGroup] = useState<string>('Core');

  const TechSelector: React.FC = React.memo(() => (
    <div className="space-y-6">
      {/* Group Selection Dropdown */}
      <div className="max-w-md">
        <select 
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="">Choose a category group...</option>
          {categoryGroups.map((group) => (
            <option key={group.name} value={group.name}>
              {group.name} - {group.description}
            </option>
          ))}
        </select>
      </div>

      {/* Collapsible Sections for Selected Group */}
      {selectedGroup && (
        <div className="space-y-3">
          {(() => {
            const group = categoryGroups.find(g => g.name === selectedGroup);
            if (!group) return null;

            return group.categories.map((category) => (
              <div key={category.id} className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div className="collapse-title font-medium flex items-center gap-3">
                  <span className="text-xl">{category.emoji}</span>
                  <div>
                    <span className="text-lg">{category.name}</span>
                    <p className="text-sm text-base-content/60 font-normal">{category.description}</p>
                  </div>
                </div>
                <div className="collapse-content">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                    {category.options.map((option) => {
                      const selected = isSelected(option.name);
                      const loadingKey = selected 
                        ? `remove-${category.id}-${option.name}`
                        : `add-${category.id}-${option.name}`;
                      const isLoading = loadingStates[loadingKey];

                      return (
                        <div
                          key={option.name}
                          className={`card bg-base-100 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                            selected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-base-200 hover:border-primary/30'
                          } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                          onClick={() => {
                            if (isLoading) return;
                            if (selected) {
                              handleRemoveTechnology(category.id, option.name);
                            } else {
                              handleAddTechnology(category.id, option);
                            }
                          }}
                        >
                          <div className="card-body p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{option.name}</h4>
                                {option.url && (
                                  <a
                                    href={option.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    title="View documentation"
                                  >
                                    ↗️
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  ));

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
    <div className="p-6 space-y-8">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Current Stack - Only show if there are technologies or packages */}
      {totalSelectedCount > 0 && (
        <div className="card bg-base-100 shadow-lg border border-base-content/10">
          <div className="card-header bg-base-200 border-b border-base-content/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Current Stack</h2>
                  <p className="text-base-content/60 text-sm">{totalSelectedCount} technologies selected</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body p-6">
            <div className="space-y-4">
              {/* All selected items in one clean list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Technologies */}
                {Object.entries(selectedTechsByCategory).map(([categoryId, techs]) => {
                  if (!techs?.length) return null;
                  // Find category by ID or fall back to a default for unknown backend categories
                  const category = STACK_CATEGORIES.find(c => c.id === categoryId) || {
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
                    // Quick lookup instead of searching through all categories
                    const techOption = techOptionsLookup.get(tech.name);
                    
                    return (
                      <div
                        key={`${categoryId}-${tech.name}`}
                        className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{category.emoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{tech.name}</span>
                              {tech.version && (
                                <span className="badge badge-xs badge-ghost">
                                  v{tech.version}
                                </span>
                              )}
                              {techOption?.url && (
                                <a
                                  href={techOption.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 text-xs"
                                  title="View documentation"
                                >
                                  ↗️
                                </a>
                              )}
                            </div>
                            <span className="text-xs text-base-content/60">{category.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTechnology(tech.category, tech.name)}
                          className={`btn btn-ghost btn-sm text-error hover:bg-error/10 ${isLoading ? 'loading' : ''}`}
                          disabled={isLoading}
                        >
                          {isLoading ? '' : '×'}
                        </button>
                      </div>
                    );
                  });
                })}
                
                {/* Packages */}
                {Object.entries(selectedPackagesByCategory).map(([categoryId, packages]) => {
                  if (!packages?.length) return null;
                  // Find category by ID or fall back to a default for unknown backend categories
                  const category = STACK_CATEGORIES.find(c => c.id === categoryId) || {
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
                    // Quick lookup instead of searching through all categories
                    const pkgOption = techOptionsLookup.get(pkg.name);
                    
                    return (
                      <div
                        key={`${categoryId}-${pkg.name}`}
                        className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{category.emoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{pkg.name}</span>
                              {pkg.version && (
                                <span className="badge badge-xs badge-ghost">
                                  v{pkg.version}
                                </span>
                              )}
                              {pkgOption?.url && (
                                <a
                                  href={pkgOption.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 text-xs"
                                  title="View documentation"
                                >
                                  ↗️
                                </a>
                              )}
                            </div>
                            <span className="text-xs text-base-content/60">{category.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTechnology(pkg.category, pkg.name)}
                          className={`btn btn-ghost btn-sm text-error hover:bg-error/10 ${isLoading ? 'loading' : ''}`}
                          disabled={isLoading}
                        >
                          {isLoading ? '' : '×'}
                        </button>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Stack */}
      <div className="card bg-base-100 shadow-lg border border-base-content/10">
        <div className="card-header bg-base-200 border-b border-base-content/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xl">🛠️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Add to Stack</h2>
              <p className="text-base-content/60 text-sm">Choose technologies for your project</p>
            </div>
          </div>
        </div>
        <div className="card-body p-6 space-y-3">
          {/* Target Platforms */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Target Platforms</h3>
            <div className="flex gap-3">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`btn btn-sm gap-2 ${
                    selectedPlatforms.has(platform.id)
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  <span>{platform.emoji}</span>
                  <span>{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider"></div>

          {/* Tech Stack Categories */}
          <div>
            <TechSelector />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StackPage;