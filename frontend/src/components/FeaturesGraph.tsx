import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Doc, projectAPI } from '../api';
import { ComponentCategory, CreateComponentData, RelationshipType, ComponentRelationship } from '../../../shared/types/project';
import ComponentNode from './ComponentNode';
import AreaNode from './AreaNode';
import GraphControls from './GraphControls';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { getAllCategories, getCategoryColor } from '../config/componentCategories';

// Define nodeTypes outside component to prevent recreation and React Flow warnings
const NODE_TYPES = {
  componentNode: ComponentNode,
  areaNode: AreaNode,
};

interface FeaturesGraphProps {
  docs: Doc[];
  projectId: string;
  onDocClick?: (component: Doc) => void;
  onDocEdit?: (component: Doc) => void;
  onCreateDoc?: (component: CreateComponentData) => Promise<void>;
  creating?: boolean;
  onRefresh?: () => Promise<void>;
}

type ViewMode = 'graph' | 'cards';
type LayoutMode = 'feature' | 'type';

const FeaturesGraphInner: React.FC<FeaturesGraphProps> = ({ docs, projectId, onDocClick, onDocEdit, onCreateDoc, creating, onRefresh }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<ComponentCategory>>(
    new Set<ComponentCategory>(['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'])
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('feature');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { fitView } = useReactFlow();

  // Relationship management state
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<RelationshipType>('uses');
  const [relationshipDescription, setRelationshipDescription] = useState('');
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initialize selected features
  useEffect(() => {
    const features = Array.from(new Set(docs.map(d => d.feature).filter(Boolean))) as string[];
    setSelectedFeatures(new Set(features));
  }, [docs]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ESC key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNode) {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedNode]);

  // Update selected node when docs change (to refresh sidebar with new relationship data)
  useEffect(() => {
    if (selectedNode) {
      const updatedComponent = docs.find(d => d.id === selectedNode.id);
      if (updatedComponent) {
        setSelectedNode({
          ...selectedNode,
          data: {
            ...selectedNode.data,
            component: updatedComponent,
          },
        });
      }
    }
  }, [docs]); // Only depend on docs, not selectedNode to avoid infinite loop

  // Generate nodes and edges from components
  const generateGraph = useCallback((useStoredPositions = true) => {
    const storageKey = `graph-layout-${projectId}-${layoutMode}`;
    const storedPositions = useStoredPositions
      ? JSON.parse(localStorage.getItem(storageKey) || '{}')
      : {};

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    if (layoutMode === 'feature') {
      // Group by feature
      const componentsByFeature: Record<string, Doc[]> = {};
      docs.forEach(component => {
        const featureKey = component.feature || 'Ungrouped';
        if (!componentsByFeature[featureKey]) componentsByFeature[featureKey] = [];
        componentsByFeature[featureKey].push(component);
      });

      const features = Object.keys(componentsByFeature);
      const featureSpacing = 450;
      const nodeSpacing = 150;
      const featuresPerRow = Math.ceil(Math.sqrt(features.length));

      features.forEach((feature, featureIndex) => {
        const featureComponents = componentsByFeature[feature];
        const row = Math.floor(featureIndex / featuresPerRow);
        const col = featureIndex % featuresPerRow;
        const featureX = col * featureSpacing;
        const featureY = row * featureSpacing;

        featureComponents.forEach((component, componentIndex) => {
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          // Check for similar relationships (potential duplicates)
          const hasDuplicates = (component.relationships || []).some(
            rel => rel.relationType === 'similar'
          );

          const storedPos = storedPositions[component.id];
          const defaultX = featureX + (componentIndex % 3) * 200;
          const defaultY = featureY + Math.floor(componentIndex / 3) * nodeSpacing;

          // Determine node type based on component type
          const nodeType = component.type === 'area' || component.type === 'section' ? 'areaNode' : 'componentNode';

          newNodes.push({
            id: component.id,
            type: nodeType,
            position: storedPos || { x: defaultX, y: defaultY },
            data: {
              component,
              isRecent,
              isStale,
              isIncomplete,
              isOrphaned,
              hasDuplicates,
            },
          });
        });
      });
    } else {
      // Group by type
      const componentsByType: Record<Doc['type'], Doc[]> = {} as any;
      docs.forEach(component => {
        if (!componentsByType[component.type]) componentsByType[component.type] = [];
        componentsByType[component.type].push(component);
      });

      const types = Object.keys(componentsByType) as Doc['type'][];
      const typeSpacing = 450;
      const nodeSpacing = 150;

      types.forEach((type, typeIndex) => {
        const typeComponents = componentsByType[type];
        const typeX = typeIndex * typeSpacing;

        typeComponents.forEach((component, componentIndex) => {
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          // Check for similar relationships (potential duplicates)
          const hasDuplicates = (component.relationships || []).some(
            rel => rel.relationType === 'similar'
          );

          const storedPos = storedPositions[component.id];
          const defaultX = typeX;
          const defaultY = componentIndex * nodeSpacing;

          // Determine node type based on component type
          const nodeType = component.type === 'area' || component.type === 'section' ? 'areaNode' : 'componentNode';

          newNodes.push({
            id: component.id,
            type: nodeType,
            position: storedPos?.position || { x: defaultX, y: defaultY },
            width: storedPos?.width,
            height: storedPos?.height,
            data: {
              component,
              isRecent,
              isStale,
              isIncomplete,
              isOrphaned,
              hasDuplicates,
            },
          });
        });
      });
    }

    // Create edges from component relationships (deduplicate bidirectional relationships)
    const processedRelationshipIds = new Set<string>();

    docs.forEach(component => {
      if (!component.relationships || component.relationships.length === 0) return;

      component.relationships.forEach((rel: ComponentRelationship) => {
        // Skip if we've already processed this relationship (bidirectional deduplication)
        if (processedRelationshipIds.has(rel.id)) return;

        const sourceExists = newNodes.find(n => n.id === component.id);
        const targetExists = newNodes.find(n => n.id === rel.targetId);

        if (sourceExists && targetExists) {
          // Mark this relationship as processed
          processedRelationshipIds.add(rel.id);

          // Determine edge styling based on relationship type
          const relationshipStyles: Record<string, { stroke: string; animated: boolean; dasharray: string; strokeWidth: number }> = {
            mentions: { stroke: '#3b82f6', animated: true, dasharray: '0', strokeWidth: 2 },
            similar: { stroke: '#eab308', animated: false, dasharray: '5,5', strokeWidth: 3 },
            uses: { stroke: '#3b82f6', animated: false, dasharray: '0', strokeWidth: 2 },
            implements: { stroke: '#10b981', animated: false, dasharray: '5,5', strokeWidth: 2 },
            extends: { stroke: '#8b5cf6', animated: false, dasharray: '0', strokeWidth: 3 },
            depends_on: { stroke: '#f97316', animated: false, dasharray: '3,3', strokeWidth: 2 },
            calls: { stroke: '#06b6d4', animated: false, dasharray: '0', strokeWidth: 2 },
            contains: { stroke: '#6b7280', animated: false, dasharray: '0', strokeWidth: 4 },
          };

          const style = relationshipStyles[rel.relationType] || relationshipStyles.uses;

          newEdges.push({
            id: rel.id, // Use the relationship ID directly (same for both directions)
            source: component.id,
            target: rel.targetId,
            type: 'smoothstep', // Options: 'default', 'straight', 'step', 'smoothstep', 'bezier'
            animated: style.animated,
            style: {
              stroke: style.stroke,
              strokeWidth: style.strokeWidth,
              strokeDasharray: style.dasharray,
            },
            label: rel.relationType,
            labelStyle: { fontSize: 11, fill: '#cbd5e1', fontWeight: 600 },
            labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9, rx: 4, ry: 4 },
            labelBgPadding: [8, 4] as [number, number],
            data: { relationshipId: rel.id, componentId: component.id }, // Store for deletion
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);

    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 100);
  }, [docs, projectId, layoutMode, setNodes, setEdges, fitView]);

  // Initialize graph
  useEffect(() => {
    generateGraph();
  }, [generateGraph]);

  // Save node positions to localStorage when they change
  useEffect(() => {
    if (nodes.length === 0) return;

    const storageKey = `graph-layout-${projectId}-${layoutMode}`;
    const positions: Record<string, { x: number; y: number }> = {};

    nodes.forEach(node => {
      positions[node.id] = node.position;
    });

    localStorage.setItem(storageKey, JSON.stringify(positions));
  }, [nodes, projectId, layoutMode]);

  // Filter nodes and edges
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const component = (node.data as any).component as Doc;

      if (!selectedCategories.has(component.category)) return false;

      const feature = component.feature || 'Ungrouped';
      if (component.feature && !selectedFeatures.has(feature)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          component.title.toLowerCase().includes(query) ||
          component.content.toLowerCase().includes(query) ||
          (component.feature && component.feature.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [nodes, selectedCategories, selectedFeatures, searchQuery]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const handleCategoryToggle = useCallback((category: ComponentCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleFeatureToggle = useCallback((feature: string) => {
    setSelectedFeatures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feature)) {
        newSet.delete(feature);
      } else {
        newSet.add(feature);
      }
      return newSet;
    });
  }, []);

  const handleAutoLayout = useCallback(() => {
    generateGraph(false);
  }, [generateGraph]);

  const handleResetView = useCallback(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView]);

  const handleResetLayout = useCallback(() => {
    const storageKey = `graph-layout-${projectId}-${layoutMode}`;
    localStorage.removeItem(storageKey);
    generateGraph(false);
  }, [projectId, layoutMode, generateGraph]);

  // Relationship management handlers
  const handleAddRelationship = useCallback(async (targetComponentTitle: string) => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent) return;

    const targetComponent = docs.find(d => d.title === targetComponentTitle);
    if (!targetComponent) {
      setToast({ message: 'Component not found', type: 'error' });
      return;
    }

    setIsAddingRelationship(true);
    try {
      await projectAPI.createRelationship(projectId, selectedComponent.id, {
        targetId: targetComponent.id,
        relationType: selectedRelationType,
        description: relationshipDescription || undefined,
      });

      // Reset form
      setRelationshipSearch('');
      setRelationshipDescription('');
      setSelectedRelationType('uses');

      setToast({ message: `Relationship added: ${selectedRelationType} → ${targetComponent.title}`, type: 'success' });

      // Refresh data from parent to get updated relationships
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to add relationship:', error);
      setToast({ message: 'Failed to add relationship', type: 'error' });
    } finally {
      setIsAddingRelationship(false);
    }
  }, [selectedNode, docs, projectId, selectedRelationType, relationshipDescription, onRefresh]);

  const handleDeleteRelationship = useCallback(async (relationshipId: string) => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent) return;

    try {
      await projectAPI.deleteRelationship(projectId, selectedComponent.id, relationshipId);

      setToast({ message: 'Relationship deleted', type: 'success' });

      // Refresh data from parent to get updated relationships
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      setToast({ message: 'Failed to delete relationship', type: 'error' });
    }
  }, [selectedNode, projectId, onRefresh]);

  if (docs.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-base-200 rounded-lg border-2 border-base-content/20">
        <div className="text-center">
          <div className="text-6xl mb-4">🕸️</div>
          <h3 className="text-lg font-bold mb-2">No components yet</h3>
          <p className="text-base-content/60">Create some components to see them in the graph view</p>
        </div>
      </div>
    );
  }

  const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;

  return (
    <div className="flex gap-4">
      {/* Controls Sidebar */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <GraphControls
          docs={docs}
          selectedCategories={selectedCategories}
          selectedFeatures={selectedFeatures}
          onCategoryToggle={handleCategoryToggle}
          onFeatureToggle={handleFeatureToggle}
          onAutoLayout={handleAutoLayout}
          onResetView={handleResetView}
          onResetLayout={handleResetLayout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateDoc={onCreateDoc}
          creating={creating}
        />

        {/* View Mode Toggle */}
        <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4">
          <div className="text-xs font-semibold text-base-content/60 mb-2">View Mode</div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('graph')}
              className={`btn btn-sm flex-1 ${viewMode === 'graph' ? 'btn-primary' : 'btn-ghost'}`}
              style={viewMode === 'graph' ? { color: getContrastTextColor('primary') } : {}}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Graph
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`btn btn-sm flex-1 ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
              style={viewMode === 'cards' ? { color: getContrastTextColor('primary') } : {}}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
          </div>
        </div>

        {/* Graph Layout Mode (only shown in graph view) */}
        {viewMode === 'graph' && (
          <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4">
            <div className="text-xs font-semibold text-base-content/60 mb-2">Graph Layout</div>
            <div className="flex gap-2">
              <button
                onClick={() => setLayoutMode('feature')}
                className={`btn btn-sm flex-1 ${layoutMode === 'feature' ? 'btn-primary' : 'btn-ghost'}`}
                style={layoutMode === 'feature' ? { color: getContrastTextColor('primary') } : {}}
              >
                Feature
              </button>
              <button
                onClick={() => setLayoutMode('type')}
                className={`btn btn-sm flex-1 ${layoutMode === 'type' ? 'btn-primary' : 'btn-ghost'}`}
                style={layoutMode === 'type' ? { color: getContrastTextColor('primary') } : {}}
              >
                Type
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area - Graph or Cards */}
      <div className="flex-1 h-[600px] relative">
        {viewMode === 'graph' ? (
          /* Graph Canvas */
          <div className="absolute inset-0 bg-base-200 rounded-lg border-2 border-base-content/20 overflow-hidden">
            <ReactFlow
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              nodeTypes={NODE_TYPES}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
            >
              <Background color="#94a3b8" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const component = (node.data as any).component as Doc;
                  return getCategoryColor(component.category);
                }}
                maskColor="rgba(0, 0, 0, 0.6)"

                // TODO on clicking node, use hook centerOnNode
              />
            </ReactFlow>
          </div>
        ) : (
          /* Cards View */
          <div className="absolute inset-0 bg-base-200 rounded-lg border-2 border-base-content/20 overflow-y-auto p-4">
            {(() => {
              // Filter components
              const filteredDocs = docs.filter(component => {
                if (!selectedCategories.has(component.category)) return false;

                const feature = component.feature || 'Ungrouped';
                if (component.feature && !selectedFeatures.has(feature)) return false;

                if (searchQuery) {
                  const query = searchQuery.toLowerCase();
                  return (
                    component.title.toLowerCase().includes(query) ||
                    component.content.toLowerCase().includes(query) ||
                    (component.feature && component.feature.toLowerCase().includes(query))
                  );
                }

                return true;
              });

              // Group by feature
              const componentsByFeature: Record<string, Doc[]> = {};
              filteredDocs.forEach(component => {
                const featureKey = component.feature || 'Ungrouped';
                if (!componentsByFeature[featureKey]) componentsByFeature[featureKey] = [];
                componentsByFeature[featureKey].push(component);
              });

              const features = Object.keys(componentsByFeature).sort();

              if (features.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-bold mb-2">No components found</h3>
                    <p className="text-base-content/60">Try adjusting your filters or search query</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {features.map(feature => (
                    <div key={feature} className="collapse collapse-arrow bg-base-100 border-2 border-base-content/20">
                      <input type="checkbox" defaultChecked className="peer" />
                      <div className="collapse-title text-lg font-medium flex items-center justify-between">
                        <span>{feature}</span>
                        <span className="badge badge-primary badge-sm">
                          {componentsByFeature[feature].length}
                        </span>
                      </div>
                      <div className="collapse-content">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                          {componentsByFeature[feature].map(component => {
                            const categoryInfo = getAllCategories().find(c => c.value === component.category);
                            const relationshipCount = component.relationships?.length || 0;

                            return (
                              <div
                                key={component.id}
                                onClick={() => {
                                  // Create a pseudo node to work with existing sidebar logic
                                  setSelectedNode({
                                    id: component.id,
                                    type: 'componentNode',
                                    position: { x: 0, y: 0 },
                                    data: {
                                      component,
                                      isRecent: new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000,
                                      isStale: new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000,
                                      isIncomplete: component.content.length < 100,
                                      isOrphaned: !component.feature,
                                      hasDuplicates: (component.relationships || []).some((rel: ComponentRelationship) => rel.relationType === 'similar'),
                                    },
                                  });
                                }}
                                className={`card bg-base-200 border-2 transition-all cursor-pointer hover:shadow-lg ${
                                  selectedNode?.id === component.id
                                    ? 'border-primary shadow-lg scale-105'
                                    : 'border-base-content/20 hover:border-primary/50'
                                }`}
                                style={selectedNode?.id === component.id ? {
                                  borderColor: categoryInfo?.color,
                                  boxShadow: `0 0 20px ${categoryInfo?.color}40`
                                } : {}}
                              >
                                <div className="card-body p-3 space-y-2">
                                  {/* Category badge */}
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="badge badge-sm"
                                      style={{
                                        backgroundColor: categoryInfo?.color,
                                        color: 'white',
                                        borderColor: categoryInfo?.color
                                      }}
                                    >
                                      {categoryInfo?.emoji} {component.category}
                                    </span>
                                    <span className="text-xs text-base-content/60">{component.type}</span>
                                  </div>

                                  {/* Title */}
                                  <h4 className="font-bold text-sm line-clamp-2">{component.title}</h4>

                                  {/* Content preview */}
                                  <p className="text-xs text-base-content/70 line-clamp-2">
                                    {component.content.substring(0, 100)}
                                    {component.content.length > 100 && '...'}
                                  </p>

                                  {/* Stats */}
                                  <div className="flex items-center gap-2 text-xs text-base-content/60 pt-1 border-t border-base-content/10">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                      <span>{relationshipCount}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>{new Date(component.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Selected Component Sidebar */}
      {selectedComponent && (
        <div className="w-80 bg-base-100 border-2 border-base-content/20 rounded-lg p-4 space-y-3 max-h-[600px] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-base-content/60 mb-1">Selected Component</div>
              <h3 className="font-bold text-lg">{selectedComponent.title}</h3>
              {selectedComponent.feature && (
                <span className="badge badge-sm badge-primary mt-1">{selectedComponent.feature}</span>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-xs font-semibold text-base-content/60">Category & Type</div>
              <div className="text-sm">
                {getAllCategories().find(c => c.value === selectedComponent.category)?.emoji} {selectedComponent.category} • {selectedComponent.type}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-base-content/60">Content Preview</div>
              <div className="text-sm bg-base-200 p-2 rounded max-h-32 overflow-y-auto">
                {selectedComponent.content.substring(0, 200)}
                {selectedComponent.content.length > 200 && '...'}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-base-content/60">Stats</div>
              <div className="text-xs space-y-1">
                <div>Size: {selectedComponent.content.length} chars</div>
                <div>Created: {new Date(selectedComponent.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(selectedComponent.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Relationships Management */}
            <div>
              <div className="text-xs font-semibold text-base-content/60 mb-2">Relationships</div>

              {/* Current relationships list */}
              {(!selectedComponent.relationships || selectedComponent.relationships.length === 0) ? (
                <div className="text-xs text-base-content/50 mb-3">No relationships yet</div>
              ) : (
                <div className="space-y-2 mb-3">
                  {selectedComponent.relationships.map((rel: ComponentRelationship) => {
                    const targetComponent = docs.find(d => d.id === rel.targetId);
                    if (!targetComponent) return null;

                    const relationshipColors: Record<string, string> = {
                      mentions: '#3b82f6',
                      similar: '#eab308',
                      uses: '#3b82f6',
                      implements: '#10b981',
                      extends: '#8b5cf6',
                      depends_on: '#f97316',
                      calls: '#06b6d4',
                      contains: '#6b7280',
                    };

                    return (
                      <div key={rel.id} className="bg-base-200 p-2 rounded space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="badge badge-xs"
                              style={{ backgroundColor: relationshipColors[rel.relationType], color: 'white', borderColor: relationshipColors[rel.relationType] }}
                            >
                              {rel.relationType}
                            </span>
                            <span className="text-xs font-medium truncate">{targetComponent.title}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteRelationship(rel.id)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Delete relationship"
                          >
                            ✕
                          </button>
                        </div>
                        {rel.description && (
                          <div className="text-xs text-base-content/60 pl-1">{rel.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add relationship form */}
              <div className="border-t border-base-content/10 pt-3 space-y-2">
                <div className="text-xs font-semibold text-base-content/60">Add Relationship</div>

                {/* Target component autocomplete */}
                <div className="form-control">
                  <input
                    type="text"
                    value={relationshipSearch}
                    onChange={(e) => setRelationshipSearch(e.target.value)}
                    placeholder="Search component..."
                    className="input input-bordered input-sm w-full"
                    list={`relationship-targets-${selectedComponent.id}`}
                  />
                  <datalist id={`relationship-targets-${selectedComponent.id}`}>
                    {docs
                      .filter(d =>
                        d.id !== selectedComponent.id &&
                        d.title.toLowerCase().includes(relationshipSearch.toLowerCase())
                      )
                      .map(d => (
                        <option key={d.id} value={d.title} />
                      ))}
                  </datalist>
                </div>

                {/* Relationship type selector */}
                <select
                  value={selectedRelationType}
                  onChange={(e) => setSelectedRelationType(e.target.value as RelationshipType)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="uses">Uses</option>
                  <option value="implements">Implements</option>
                  <option value="extends">Extends</option>
                  <option value="depends_on">Depends On</option>
                  <option value="calls">Calls</option>
                  <option value="contains">Contains</option>
                </select>

                {/* Optional description */}
                <textarea
                  value={relationshipDescription}
                  onChange={(e) => setRelationshipDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="textarea textarea-bordered textarea-sm w-full h-16"
                />

                {/* Add button */}
                <button
                  onClick={() => handleAddRelationship(relationshipSearch)}
                  disabled={isAddingRelationship || !relationshipSearch.trim()}
                  className="btn btn-sm btn-primary w-full"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  {isAddingRelationship ? 'Adding...' : 'Add Relationship'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDocEdit && onDocEdit(selectedComponent)}
              className="btn btn-sm btn-primary flex-1"
              style={{ color: getContrastTextColor('primary') }}
            >
              Edit
            </button>
            <button
              onClick={() => onDocClick && onDocClick(selectedComponent)}
              className="btn btn-sm btn-ghost flex-1"
            >
              View Full
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'} shadow-lg`}>
            <div>
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="btn btn-sm btn-ghost btn-circle">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

const FeaturesGraph: React.FC<FeaturesGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FeaturesGraphInner {...props} />
    </ReactFlowProvider>
  );
};

export default FeaturesGraph;
