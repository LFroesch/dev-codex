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
import { Doc } from '../api';
import ComponentNode from './ComponentNode';
import GraphControls from './GraphControls';
import { getContrastTextColor } from '../utils/contrastTextColor';

const nodeTypes = {
  componentNode: ComponentNode,
};

interface FeaturesGraphProps {
  docs: Doc[];
  projectId: string;
  onDocClick?: (component: Doc) => void;
  onDocEdit?: (component: Doc) => void;
  onCreateDoc?: (component: { type: Doc['type']; title: string; content: string; feature?: string }) => Promise<void>;
  creating?: boolean;
}

const componentTypes: Array<{ value: Doc['type']; label: string; emoji: string; description: string }> = [
  { value: 'Core', label: 'Core', emoji: '🎯', description: 'Core functionality and business logic' },
  { value: 'API', label: 'API', emoji: '🔌', description: 'API endpoints and contracts' },
  { value: 'Data', label: 'Data', emoji: '🗃️', description: 'Data models and database schemas' },
  { value: 'UI', label: 'UI', emoji: '🎨', description: 'User interface components' },
  { value: 'Config', label: 'Config', emoji: '⚙️', description: 'Configuration and settings' },
  { value: 'Security', label: 'Security', emoji: '🔐', description: 'Authentication and authorization' },
  { value: 'Docs', label: 'Docs', emoji: '📚', description: 'Documentation and guides' },
  { value: 'Dependencies', label: 'Dependencies', emoji: '📦', description: 'External dependencies and integrations' },
];

type LayoutMode = 'feature' | 'type';

interface ComponentRelationship {
  sourceId: string;
  targetId: string;
  type: 'mentions' | 'similar';
}

const FeaturesGraphInner: React.FC<FeaturesGraphProps> = ({ docs, projectId, onDocClick, onDocEdit, onCreateDoc, creating }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<Doc['type']>>(
    new Set(componentTypes.map(t => t.value))
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('feature');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { fitView } = useReactFlow();

  // Initialize selected features
  useEffect(() => {
    const features = Array.from(new Set(docs.map(d => d.feature).filter(Boolean))) as string[];
    setSelectedFeatures(new Set(features));
  }, [docs]);

  // Detect relationships between components
  const detectRelationships = useCallback((components: Doc[]): ComponentRelationship[] => {
    const relationships: ComponentRelationship[] = [];

    components.forEach((sourceComponent, i) => {
      components.forEach((targetComponent, j) => {
        if (i === j) return;

        const sourceContent = sourceComponent.content.toLowerCase();
        const sourceTitle = sourceComponent.title.toLowerCase();
        const targetTitle = targetComponent.title.toLowerCase();

        // Check if source mentions target by title
        if (sourceContent.includes(targetTitle) || sourceTitle.includes(targetTitle)) {
          relationships.push({
            sourceId: sourceComponent.id,
            targetId: targetComponent.id,
            type: 'mentions',
          });
        }

        // Check for similar titles (potential duplicates)
        const similarity = calculateSimilarity(sourceComponent.title, targetComponent.title);
        if (similarity > 0.6 && sourceComponent.id < targetComponent.id) { // Only add once
          relationships.push({
            sourceId: sourceComponent.id,
            targetId: targetComponent.id,
            type: 'similar',
          });
        }
      });
    });

    return relationships;
  }, []);

  // Simple string similarity (Jaccard similarity)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  };

  // Analyze coverage for each feature
  const analyzeCoverage = useCallback((components: Doc[]) => {
    const coverage: Record<string, { types: Set<Doc['type']>; missing: Doc['type'][] }> = {};
    const allComponentTypesArray = componentTypes.map(t => t.value);

    // Group by feature
    const byFeature: Record<string, Doc[]> = {};
    components.forEach(component => {
      const feature = component.feature || 'Ungrouped';
      if (!byFeature[feature]) byFeature[feature] = [];
      byFeature[feature].push(component);
    });

    // Calculate coverage for each feature
    Object.entries(byFeature).forEach(([feature, featureComponents]) => {
      const types = new Set(featureComponents.map(d => d.type));
      const missing = allComponentTypesArray.filter(t => !types.has(t));
      coverage[feature] = { types, missing };
    });

    return coverage;
  }, []);

  // Generate nodes and edges from components
  const generateGraph = useCallback((useStoredPositions = true) => {
    const storageKey = `graph-layout-${projectId}-${layoutMode}`;
    const storedPositions = useStoredPositions
      ? JSON.parse(localStorage.getItem(storageKey) || '{}')
      : {};

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Detect relationships
    const relationships = detectRelationships(docs);
    const coverage = analyzeCoverage(docs);

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
          const componentType = componentTypes.find(t => t.value === component.type);
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          // Check for duplicates
          const duplicates = relationships.filter(
            r => r.type === 'similar' && (r.sourceId === component.id || r.targetId === component.id)
          );

          const storedPos = storedPositions[component.id];
          const defaultX = featureX + (componentIndex % 3) * 200;
          const defaultY = featureY + Math.floor(componentIndex / 3) * nodeSpacing;

          newNodes.push({
            id: component.id,
            type: 'componentNode',
            position: storedPos || { x: defaultX, y: defaultY },
            data: {
              component,
              componentType,
              isRecent,
              isStale,
              isIncomplete,
              isOrphaned,
              hasDuplicates: duplicates.length > 0,
              coverage: coverage[feature] || { types: new Set(), missing: [] },
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
          const componentType = componentTypes.find(t => t.value === component.type);
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          const duplicates = relationships.filter(
            r => r.type === 'similar' && (r.sourceId === component.id || r.targetId === component.id)
          );

          const storedPos = storedPositions[component.id];
          const defaultX = typeX;
          const defaultY = componentIndex * nodeSpacing;

          newNodes.push({
            id: component.id,
            type: 'componentNode',
            position: storedPos || { x: defaultX, y: defaultY },
            data: {
              component,
              componentType,
              isRecent,
              isStale,
              isIncomplete,
              isOrphaned,
              hasDuplicates: duplicates.length > 0,
              coverage: { types: new Set(), missing: [] },
            },
          });
        });
      });
    }

    // Create edges for relationships
    relationships.forEach(rel => {
      const sourceExists = newNodes.find(n => n.id === rel.sourceId);
      const targetExists = newNodes.find(n => n.id === rel.targetId);

      if (sourceExists && targetExists) {
        newEdges.push({
          id: `${rel.sourceId}-${rel.targetId}`,
          source: rel.sourceId,
          target: rel.targetId,
          type: 'smoothstep',
          animated: rel.type === 'mentions',
          style: {
            stroke: rel.type === 'mentions' ? '#3b82f6' : '#eab308',
            strokeWidth: 2,
            strokeDasharray: rel.type === 'similar' ? '5,5' : '0',
          },
          label: rel.type === 'mentions' ? 'uses' : 'similar',
          labelStyle: { fontSize: 10, fill: '#64748b' },
          labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);

    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 100);
  }, [docs, projectId, layoutMode, setNodes, setEdges, fitView, detectRelationships, analyzeCoverage]);

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

      if (!selectedTypes.has(component.type)) return false;

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
  }, [nodes, selectedTypes, selectedFeatures, searchQuery]);

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

  const handleTypeToggle = useCallback((type: Doc['type']) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
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
          selectedTypes={selectedTypes}
          selectedFeatures={selectedFeatures}
          onTypeToggle={handleTypeToggle}
          onFeatureToggle={handleFeatureToggle}
          onAutoLayout={handleAutoLayout}
          onResetView={handleResetView}
          onResetLayout={handleResetLayout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateDoc={onCreateDoc}
          creating={creating}
        />

        {/* Layout Mode Toggle */}
        <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4">
          <div className="text-xs font-semibold text-base-content/60 mb-2">Layout Mode</div>
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
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 h-[600px] relative">
        <div className="absolute inset-0 bg-base-200 rounded-lg border-2 border-base-content/20 overflow-hidden">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
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
                const colorMap: Record<Doc['type'], string> = {
                  'Core': '#22c55e',
                  'API': '#3b82f6',
                  'Data': '#f97316',
                  'UI': '#a855f7',
                  'Config': '#eab308',
                  'Security': '#ef4444',
                  'Docs': '#ec4899',
                  'Dependencies': '#06b6d4',
                };
                return colorMap[component.type] || '#64748b';
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Panel position="top-right">
              <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-2 shadow-lg text-xs">
                <div className="font-semibold mb-1">Legend</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span>Uses (animated)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-yellow-500 border-dashed border-t-2 border-yellow-500"></div>
                    <span>Similar</span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
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
              <div className="text-xs font-semibold text-base-content/60">Type</div>
              <div className="text-sm">{componentTypes.find(t => t.value === selectedComponent.type)?.emoji} {selectedComponent.type}</div>
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

            {/* Relationships */}
            <div>
              <div className="text-xs font-semibold text-base-content/60 mb-1">Relationships</div>
              {edges.filter(e => e.source === selectedComponent.id || e.target === selectedComponent.id).length === 0 ? (
                <div className="text-xs text-base-content/50">No connections</div>
              ) : (
                <div className="space-y-1">
                  {edges
                    .filter(e => e.source === selectedComponent.id || e.target === selectedComponent.id)
                    .map(edge => {
                      const otherComponentId = edge.source === selectedComponent.id ? edge.target : edge.source;
                      const otherComponent = docs.find(d => d.id === otherComponentId);
                      return (
                        <div key={edge.id} className="text-xs bg-base-200 p-1 rounded">
                          {edge.source === selectedComponent.id ? '→' : '←'} {otherComponent?.title || 'Unknown'}
                        </div>
                      );
                    })}
                </div>
              )}
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
