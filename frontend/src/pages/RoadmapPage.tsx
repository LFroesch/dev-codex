import React, { useState, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, projectAPI } from '../api';
import { TECH_CATEGORIES, PACKAGE_CATEGORIES, TechCategory, TechOption } from '../data/techStackData';

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const RoadmapPage: React.FC = () => {
  const { selectedProject, onProjectRefresh } = useOutletContext<ContextType>();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPackageCategory, setSelectedPackageCategory] = useState<string>('');
  const [error, setError] = useState('');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  const handleAddTechnology = useCallback(async (category: string, tech: TechOption) => {
    if (!selectedProject) return;

    const loadingKey = `tech-${category}-${tech.name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      await projectAPI.addTechnology(selectedProject.id, {
        category: category as any,
        name: tech.name,
        version: tech.latestVersion || ''
      });
      await onProjectRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add technology');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);

  const handleRemoveTechnology = useCallback(async (category: string, name: string) => {
    if (!selectedProject) return;

    const loadingKey = `tech-remove-${category}-${name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      await projectAPI.removeTechnology(selectedProject.id, category, name);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to remove technology');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);

  const handleAddPackage = useCallback(async (category: string, pkg: TechOption) => {
    if (!selectedProject) return;

    const loadingKey = `pkg-${category}-${pkg.name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      await projectAPI.addPackage(selectedProject.id, {
        category: category as any,
        name: pkg.name,
        version: pkg.latestVersion || '',
        description: pkg.description
      });
      await onProjectRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add package');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);

  const handleRemovePackage = useCallback(async (category: string, name: string) => {
    if (!selectedProject) return;

    const loadingKey = `pkg-remove-${category}-${name}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    setError('');

    try {
      await projectAPI.removePackage(selectedProject.id, category, name);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to remove package');
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [selectedProject, onProjectRefresh]);

  // Memoize the selected technologies and packages lookups
  const selectedTechLookup = useMemo(() => {
    if (!selectedProject?.selectedTechnologies) return new Set();
    return new Set(
      selectedProject.selectedTechnologies.map(tech => `${tech.category}-${tech.name}`)
    );
  }, [selectedProject?.selectedTechnologies]);

  const selectedPackageLookup = useMemo(() => {
    if (!selectedProject?.selectedPackages) return new Set();
    return new Set(
      selectedProject.selectedPackages.map(pkg => `${pkg.category}-${pkg.name}`)
    );
  }, [selectedProject?.selectedPackages]);

  const isSelected = useCallback((category: string, name: string, type: 'tech' | 'package') => {
    if (!selectedProject) return false;
    
    const key = `${category}-${name}`;
    return type === 'tech' ? selectedTechLookup.has(key) : selectedPackageLookup.has(key);
  }, [selectedProject, selectedTechLookup, selectedPackageLookup]);

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

  const TechSelector: React.FC<{
    categories: TechCategory[];
    type: 'tech' | 'package';
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
  }> = React.memo(({ categories, type, selectedCategory, onCategoryChange }) => (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(selectedCategory === category.id ? '' : category.id)}
            className={`btn btn-sm gap-2 ${
              selectedCategory === category.id 
                ? 'btn-primary' 
                : 'btn-outline'
            }`}
            style={{
              borderColor: selectedCategory === category.id ? category.color : undefined,
              backgroundColor: selectedCategory === category.id ? category.color : undefined
            }}
          >
            <span className="text-lg">{category.emoji}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Tech Options */}
      {selectedCategory && (
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            {(() => {
              const category = categories.find(c => c.id === selectedCategory);
              if (!category) return null;

              return (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{category.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-sm text-base-content/60">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.options.map((option) => {
                      const selected = isSelected(category.id, option.name, type);
                      const loadingKey = selected 
                        ? `${type}-remove-${category.id}-${option.name}`
                        : `${type}-${category.id}-${option.name}`;
                      const isLoading = loadingStates[loadingKey];

                      return (
                        <div
                          key={option.name}
                          className={`card bg-base-100 shadow-sm border-2 transition-all cursor-pointer ${
                            selected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-base-300 hover:border-primary/50'
                          } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                          onClick={() => {
                            if (isLoading) return;
                            if (selected) {
                              type === 'tech' 
                                ? handleRemoveTechnology(category.id, option.name)
                                : handleRemovePackage(category.id, option.name);
                            } else {
                              type === 'tech'
                                ? handleAddTechnology(category.id, option)
                                : handleAddPackage(category.id, option);
                            }
                          }}
                        >
                          <div className="card-body p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{option.name}</h4>
                                <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
                                  {option.description}
                                </p>
                                {option.latestVersion && (
                                  <div className="badge badge-xs badge-ghost mt-2">
                                    v{option.latestVersion}
                                  </div>
                                )}
                              </div>
                              <div className="ml-2">
                                {isLoading ? (
                                  <div className="loading loading-spinner loading-sm"></div>
                                ) : selected ? (
                                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
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
    <div className="p-6 space-y-6">

      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Selected Stack Display - Only show if there are technologies or packages */}
      {totalSelectedCount > 0 && (
        <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
            Selected Stack ({totalSelectedCount})
          </div>
          <div className="collapse-content">
            <div className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Technologies */}
                {TECH_CATEGORIES.map((category) => {
                  const selectedInCategory = selectedTechsByCategory[category.id];
                  if (!selectedInCategory?.length) return null;

                  return (
                    <div key={category.id} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{category.emoji}</span>
                          <h3 className="font-semibold">{category.name}</h3>
                          <span className="badge badge-sm badge-primary">Tech</span>
                        </div>
                        <div className="space-y-2">
                          {selectedInCategory.map((tech) => {
                            const loadingKey = `tech-remove-${tech.category}-${tech.name}`;
                            const isLoading = loadingStates[loadingKey];
                            
                            return (
                              <div key={tech.name} className="flex items-center justify-between p-2 bg-base-100 rounded border">
                                <div>
                                  <span className="font-medium">{tech.name}</span>
                                  {tech.version && (
                                    <span className="text-xs text-base-content/60 ml-2">v{tech.version}</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveTechnology(tech.category, tech.name)}
                                  className={`btn btn-ghost btn-xs text-error ${isLoading ? 'loading' : ''}`}
                                  disabled={isLoading}
                                >
                                  {isLoading ? '' : '×'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Packages */}
                {PACKAGE_CATEGORIES.map((category) => {
                  const selectedInCategory = selectedPackagesByCategory[category.id];
                  if (!selectedInCategory?.length) return null;

                  return (
                    <div key={`pkg-${category.id}`} className="card bg-base-200 shadow-sm">
                      <div className="card-body p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{category.emoji}</span>
                          <h3 className="font-semibold">{category.name}</h3>
                          <span className="badge badge-sm badge-secondary">Package</span>
                        </div>
                        <div className="space-y-2">
                          {selectedInCategory.map((pkg) => {
                            const loadingKey = `pkg-remove-${pkg.category}-${pkg.name}`;
                            const isLoading = loadingStates[loadingKey];
                            
                            return (
                              <div key={pkg.name} className="flex items-center justify-between p-2 bg-base-100 rounded border">
                                <div>
                                  <span className="font-medium">{pkg.name}</span>
                                  {pkg.version && (
                                    <span className="text-xs text-base-content/60 ml-2">v{pkg.version}</span>
                                  )}
                                  {pkg.description && (
                                    <p className="text-xs text-base-content/50 mt-1">{pkg.description}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemovePackage(pkg.category, pkg.name)}
                                  className={`btn btn-ghost btn-xs text-error ${isLoading ? 'loading' : ''}`}
                                  disabled={isLoading}
                                >
                                  {isLoading ? '' : '×'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technology Selection */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Add Technologies
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <TechSelector
              categories={TECH_CATEGORIES}
              type="tech"
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {/* Package Selection */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Add Packages
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <TechSelector
              categories={PACKAGE_CATEGORIES}
              type="package"
              selectedCategory={selectedPackageCategory}
              onCategoryChange={setSelectedPackageCategory}
            />
          </div>
        </div>
      </div>

      {/* Project Statistics */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Project Statistics
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="stat-title">Technologies</div>
                <div className="stat-value text-primary">{selectedProject.selectedTechnologies?.length || 0}</div>
                <div className="stat-desc">Core technologies selected</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="stat-title">Packages</div>
                <div className="stat-value text-secondary">{selectedProject.selectedPackages?.length || 0}</div>
                <div className="stat-desc">NPM packages added</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-accent">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="stat-title">Active Tasks</div>
                <div className="stat-value text-accent">
                  {selectedProject.todos?.filter(todo => !todo.completed).length || 0}
                </div>
                <div className="stat-desc">
                  {selectedProject.todos?.filter(todo => todo.completed).length || 0} completed
                </div>
              </div>

              <div className="stat">
                <div className="stat-figure text-info">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="stat-title">Documentation</div>
                <div className="stat-value text-info">{selectedProject.docs?.length || 0}</div>
                <div className="stat-desc">Documentation templates created</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;