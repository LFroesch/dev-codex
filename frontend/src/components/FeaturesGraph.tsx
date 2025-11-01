import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  useNodesState,
  useEdgesState,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { BaseComponent } from '../../../shared/types/project';
import { ComponentCategory, CreateComponentData, RelationshipType, ComponentRelationship } from '../../../shared/types/project';
import ComponentNode from './ComponentNode';
import AreaNode from './AreaNode';
import GraphControls from './GraphControls';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { getAllCategories, getCategoryColor, getTypesForCategory } from '../config/componentCategories';
import { useRelationshipManagement } from '../hooks/useRelationshipManagement';
import { useComponentEditing } from '../hooks/useComponentEditing';

// Define nodeTypes outside component to prevent recreation and React Flow warnings
const NODE_TYPES = {
  componentNode: ComponentNode,
  areaNode: AreaNode,
};

// Relationship type priorities (higher = more important for layout hierarchy)
const RELATIONSHIP_WEIGHTS: Record<RelationshipType, number> = {
  contains: 10,     // Strong hierarchical - parent always above child
  extends: 8,       // Clear inheritance flow
  depends_on: 7,    // Dependency should flow downward
  implements: 6,    // Interface above implementation
  uses: 4,          // General usage
  calls: 4,         // Function calls
};

// Relationship type colors for edges and UI
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  uses: '#3b82f6',
  implements: '#10b981',
  extends: '#8b5cf6',
  depends_on: '#f97316',
  calls: '#06b6d4',
  contains: '#6b7280',
};

/**
 * Get the weight/importance of a relationship type for layout purposes
 */
const getRelationshipWeight = (type: RelationshipType): number => {
  return RELATIONSHIP_WEIGHTS[type] || 1;
};

/**
 * Get minimum rank separation for hierarchical relationships
 * Hierarchical relationships need more vertical/horizontal separation
 */
const getMinLength = (type: RelationshipType): number => {
  if (['contains', 'extends', 'depends_on'].includes(type)) {
    return 2; // Two ranks apart minimum for clear hierarchy
  }
  return 1;
};

/**
 * Calculate connection strength based on weighted relationships
 * This gives a better importance metric than just counting relationships
 */
const calculateConnectionStrength = (doc: BaseComponent): number => {
  return (doc.relationships || []).reduce((sum: number, rel: ComponentRelationship) => {
    return sum + getRelationshipWeight(rel.relationType);
  }, 0);
};

/**
 * Get sort priority for components within a feature
 * Lower numbers appear first (higher priority)
 * Section headers ALWAYS at top, then other documentation, then everything else
 */
const getComponentSortPriority = (doc: BaseComponent): number => {
  // Section headers at the very top (priority 0)
  if (doc.type === 'section' || doc.type === 'area') return 0;
  // Other documentation items (priority 1)
  if (doc.category === 'documentation') return 1;
  // Everything else (priority 2)
  return 2;
};

/**
 * Get the vertical tier/rank for a category in the architectural layout
 * Lower numbers appear higher in the graph (closer to top)
 * Order: documentation/assets > infrastructure > frontend > api > backend > security > database
 */
const getCategoryRank = (category: ComponentCategory): number => {
  const rankMap: Record<ComponentCategory, number> = {
    documentation: 0,
    asset: 0,
    infrastructure: 1,
    frontend: 2,
    api: 3,
    backend: 4,
    security: 5,
    database: 6,
  };
  return rankMap[category] ?? 3; // Default to middle tier if unknown
};

/**
 * Calculate optimal source and target handle positions based on node positions
 * This makes edges connect intelligently based on relative node positions
 */
const getEdgeHandlePositions = (
  sourceNode: Node,
  targetNode: Node
): { sourceHandle: string; targetHandle: string; sourcePosition: Position; targetPosition: Position } => {
  const sourceX = sourceNode.position.x + (sourceNode.width || 400) / 2;
  const sourceY = sourceNode.position.y + (sourceNode.height || 200) / 2;
  const targetX = targetNode.position.x + (targetNode.width || 400) / 2;
  const targetY = targetNode.position.y + (targetNode.height || 200) / 2;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  // Determine primary direction based on which delta is larger
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  if (isHorizontal) {
    // Horizontal connection
    if (dx > 0) {
      // Target is to the right
      return {
        sourceHandle: 'right',
        targetHandle: 'left',
        sourcePosition: Position.Right,
        targetPosition: Position.Left
      };
    } else {
      // Target is to the left
      return {
        sourceHandle: 'left',
        targetHandle: 'right',
        sourcePosition: Position.Left,
        targetPosition: Position.Right
      };
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      // Target is below
      return {
        sourceHandle: 'bottom',
        targetHandle: 'top',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top
      };
    } else {
      // Target is above
      return {
        sourceHandle: 'top',
        targetHandle: 'bottom',
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom
      };
    }
  }
};

interface FeaturesGraphProps {
  docs: BaseComponent[];
  projectId: string;
  onCreateDoc?: (component: CreateComponentData) => Promise<void>;
  creating?: boolean;
  onRefresh?: () => Promise<void>;
}

type ViewMode = 'graph' | 'cards';

/**
 * Filter components based on category, feature, and search query
 */
const filterComponents = (
  components: BaseComponent[],
  selectedCategories: Set<ComponentCategory>,
  selectedFeatures: Set<string>,
  searchQuery: string
): BaseComponent[] => {
  return components.filter(component => {
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
};

/**
 * Group components by their feature
 */
const groupComponentsByFeature = (components: BaseComponent[]): Record<string, BaseComponent[]> => {
  const grouped: Record<string, BaseComponent[]> = {};
  components.forEach(component => {
    const featureKey = component.feature || 'Ungrouped';
    if (!grouped[featureKey]) grouped[featureKey] = [];
    grouped[featureKey].push(component);
  });
  return grouped;
};

const FeaturesGraphInner: React.FC<FeaturesGraphProps> = ({ docs, projectId, onCreateDoc, creating, onRefresh }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<ComponentCategory>>(
    new Set<ComponentCategory>(['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'])
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [edgeType, setEdgeType] = useState<'smoothstep' | 'default'>(() => {
    const stored = localStorage.getItem('graph-edge-type');
    return (stored === 'smoothstep' || stored === 'default') ? stored : 'smoothstep';
  });
  const { fitView, setCenter } = useReactFlow();

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Get selected component from node
  const selectedComponent = selectedNode ? (selectedNode.data as { component: BaseComponent }).component : null;

  // Custom hooks for relationship and component management
  const relationshipManagement = useRelationshipManagement({
    projectId,
    selectedComponent,
    docs,
    onRefresh,
    setToast,
  });

  const componentEditing = useComponentEditing({
    projectId,
    selectedComponent,
    onRefresh,
    onClose: () => setSelectedNode(null),
    setToast,
  });

  // Initialize selected features
  useEffect(() => {
    const features = Array.from(new Set(docs.map(d => d.feature).filter(Boolean))) as string[];
    setSelectedFeatures(new Set(features));
  }, [docs]);

  // Save edge type preference to localStorage
  useEffect(() => {
    localStorage.setItem('graph-edge-type', edgeType);
  }, [edgeType]);

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
        // Create new node object with updated component data
        const newNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            component: updatedComponent,
          },
        };

        // Only update if the component data actually changed
        const currentComponent = (selectedNode.data as { component: BaseComponent }).component;
        if (JSON.stringify(currentComponent.relationships) !== JSON.stringify(updatedComponent.relationships) ||
            currentComponent.updatedAt !== updatedComponent.updatedAt) {
          setSelectedNode(newNode);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]); // Only depend on docs, not selectedNode to avoid infinite loop

  /**
   * Generate layout using Dagre algorithm (hierarchical, relationship-aware)
   */
  const generateDagreLayout = useCallback((components: BaseComponent[]) => {
    const g = new dagre.graphlib.Graph();

    // Configure graph layout
    g.setGraph({
      rankdir: 'TB', // Top-to-bottom for feature-based layout
      nodesep: 100,  // Horizontal spacing between nodes
      ranksep: 150,  // Vertical spacing between ranks
      marginx: 50,
      marginy: 50,
    });

    g.setDefaultEdgeLabel(() => ({}));

    // Find documentation/section header node for this feature
    const headerNode = components.find(doc =>
      doc.category === 'documentation' || doc.type === 'section' || doc.type === 'area'
    );

    // Calculate node sizes based on connection strength
    const nodeSizes = new Map<string, { width: number; height: number }>();
    components.forEach(doc => {
      const connectionStrength = calculateConnectionStrength(doc);

      // Area/section nodes are wider than regular component nodes
      const isAreaNode = doc.type === 'area' || doc.type === 'section';
      const baseWidth = isAreaNode ? 600 : 400;
      const baseHeight = isAreaNode ? 250 : 200;

      // Base size + scaling based on connections (with max limits)
      const width = Math.min(800, baseWidth + connectionStrength * 8);
      const height = Math.min(350, baseHeight + connectionStrength * 4);
      nodeSizes.set(doc.id, { width, height });
    });

    // Add nodes to graph with calculated sizes and category-based ranks
    components.forEach(doc => {
      const size = nodeSizes.get(doc.id) || { width: 400, height: 200 };
      let rank = getCategoryRank(doc.category);

      // Force documentation/section header to the very top (rank -1)
      if (headerNode && doc.id === headerNode.id) {
        rank = -1;
      }

      g.setNode(doc.id, {
        width: size.width,
        height: size.height,
        rank: rank, // Force node into specific tier based on category
        label: doc.title,
      });
    });

    // Add edges with semantic weighting
    components.forEach(doc => {
      (doc.relationships || []).forEach((rel: ComponentRelationship) => {
        // Only add edge if target exists in current component set
        if (components.find(d => d.id === rel.targetId)) {
          g.setEdge(doc.id, rel.targetId, {
            weight: getRelationshipWeight(rel.relationType),
            minlen: getMinLength(rel.relationType),
          });
        }
      });
    });

    // Run Dagre layout algorithm
    dagre.layout(g);

    // Group components by tier using getCategoryRank
    const tierMap: Record<number, BaseComponent[]> = {};
    components.forEach(doc => {
      // Header node at tier 0, otherwise use category rank + 1 to offset from header
      const tier = (headerNode && doc.id === headerNode.id) ? 0 : getCategoryRank(doc.category) + 1;
      if (!tierMap[tier]) tierMap[tier] = [];
      tierMap[tier].push(doc);
    });

    // Position nodes in tiers with horizontal spacing
    const layoutedNodes: Node[] = [];
    Object.keys(tierMap).forEach(tierKey => {
      const tier = parseInt(tierKey);
      let tierDocs = tierMap[tier];
      const tierY = tier * 400;
      let currentX = 0;

      // Smart horizontal ordering: sort by relationship connectivity
      // Components with relationships to each other should be adjacent
      if (tierDocs.length > 1) {
        const sortedDocs: BaseComponent[] = [];
        const remaining = new Set(tierDocs.map(d => d.id));

        // Start with the most connected component in this tier
        const firstDoc = tierDocs.reduce((best, doc) => {
          const connections = (doc.relationships || []).filter((rel: ComponentRelationship) =>
            tierDocs.some(td => td.id === rel.targetId)
          ).length;
          const bestConnections = (best.relationships || []).filter((rel: ComponentRelationship) =>
            tierDocs.some(td => td.id === rel.targetId)
          ).length;
          return connections > bestConnections ? doc : best;
        });

        sortedDocs.push(firstDoc);
        remaining.delete(firstDoc.id);

        // Iteratively add the component most connected to already-sorted components
        while (remaining.size > 0) {
          let bestNext: BaseComponent | null = null;
          let bestScore = -1;

          for (const docId of remaining) {
            const doc = tierDocs.find(d => d.id === docId)!;
            // Count connections to already-sorted components (in any tier)
            const score = (doc.relationships || []).filter((rel: ComponentRelationship) =>
              sortedDocs.some(sd => sd.id === rel.targetId) ||
              components.some(c => c.id === rel.targetId && sortedDocs.some(sd =>
                (sd.relationships || []).some((r: ComponentRelationship) => r.targetId === doc.id)
              ))
            ).reduce((sum: number, rel: ComponentRelationship) => sum + getRelationshipWeight(rel.relationType), 0);

            if (score > bestScore || bestNext === null) {
              bestScore = score;
              bestNext = doc;
            }
          }

          if (bestNext) {
            sortedDocs.push(bestNext);
            remaining.delete(bestNext.id);
          } else {
            // No connections found, just add the first remaining
            const nextDoc = tierDocs.find(d => remaining.has(d.id))!;
            sortedDocs.push(nextDoc);
            remaining.delete(nextDoc.id);
          }
        }

        tierDocs = sortedDocs;
      }

      tierDocs.forEach(doc => {
        const size = nodeSizes.get(doc.id) || { width: 400, height: 200 };
        const isRecent = new Date(doc.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        const isStale = new Date(doc.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
        const isIncomplete = doc.content.length < 100;
        const isOrphaned = !doc.feature;
        const hasDuplicates = false; // Removed similar relationship type check
        const nodeType = doc.type === 'area' || doc.type === 'section' ? 'areaNode' : 'componentNode';

        layoutedNodes.push({
          id: doc.id,
          type: nodeType,
          position: { x: currentX, y: tierY },
          width: size.width,
          height: size.height,
          data: {
            component: doc,
            isRecent,
            isStale,
            isIncomplete,
            isOrphaned,
            hasDuplicates,
          },
        });

        currentX += size.width + 100; // Add spacing between nodes
      });
    });

    return layoutedNodes;
  }, []);

  // Generate nodes and edges from components
  const generateGraph = useCallback((useStoredPositions = true) => {
    const storageKey = `graph-layout-${projectId}`;
    const storedPositions = useStoredPositions
      ? JSON.parse(localStorage.getItem(storageKey) || '{}')
      : {};

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Group by feature using shared utility
    const componentsByFeature = groupComponentsByFeature(docs);
    const features = Object.keys(componentsByFeature);

    // Use Dagre algorithm with feature clustering (horizontal multi-root layout)
    const featureGraphs: Record<string, Node[]> = {};
    let maxFeatureHeight = 0;
    let currentX = 0;

    // Layout each feature cluster independently and place horizontally
    features.forEach(feature => {
      // Sort: section headers first, then other documentation, then everything else
      const featureComponents = componentsByFeature[feature].sort((a, b) => {
        return getComponentSortPriority(a) - getComponentSortPriority(b);
      });
      const featureNodes = generateDagreLayout(featureComponents);

      // Calculate bounding box for this feature
      const minX = Math.min(...featureNodes.map(n => n.position.x));
      const maxX = Math.max(...featureNodes.map(n => n.position.x + (n.width || 400)));
      const maxY = Math.max(...featureNodes.map(n => n.position.y + (n.height || 200)));
      const featureWidth = maxX - minX;
      const featureHeight = maxY; // Keep absolute height to preserve tier spacing

      // Normalize X positions only, preserve Y tier positions
      const normalizedNodes = featureNodes.map(node => ({
        ...node,
        position: {
          x: node.position.x - minX,
          y: node.position.y, // Keep original Y to preserve tier gaps
        }
      }));

      // Group nodes by tier for centering
      const nodesByTier: Record<number, typeof normalizedNodes> = {};
      normalizedNodes.forEach(node => {
        if (!nodesByTier[node.position.y]) nodesByTier[node.position.y] = [];
        nodesByTier[node.position.y].push(node);
      });

      // Find widest tier
      let maxTierWidth = 0;
      Object.values(nodesByTier).forEach(tierNodes => {
        const tierMinX = Math.min(...tierNodes.map(n => n.position.x));
        const tierMaxX = Math.max(...tierNodes.map(n => n.position.x + (n.width || 400)));
        maxTierWidth = Math.max(maxTierWidth, tierMaxX - tierMinX);
      });

      // Center each tier
      Object.values(nodesByTier).forEach(tierNodes => {
        const tierMinX = Math.min(...tierNodes.map(n => n.position.x));
        const tierMaxX = Math.max(...tierNodes.map(n => n.position.x + (n.width || 400)));
        const tierWidth = tierMaxX - tierMinX;
        const offset = (maxTierWidth - tierWidth) / 2;

        tierNodes.forEach(node => {
          node.position.x += offset + currentX;
        });
      });

      featureGraphs[feature] = normalizedNodes;
      maxFeatureHeight = Math.max(maxFeatureHeight, featureHeight);
      currentX += featureWidth + 300; // Add horizontal spacing between feature groups
    });

    // Combine all feature clusters
    Object.values(featureGraphs).forEach(featureNodes => {
      featureNodes.forEach(node => {
        const storedPos = storedPositions[node.id];
        newNodes.push({
          ...node,
          position: storedPos || node.position,
        });
      });
    });

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

          // Calculate dynamic handle positions based on node positions
          const handlePositions = getEdgeHandlePositions(sourceExists, targetExists);

          // Determine edge styling based on relationship type
          const relationshipStyles: Record<string, { stroke: string; animated: boolean; dasharray: string; strokeWidth: number }> = {
            mentions: { stroke: RELATIONSHIP_COLORS.mentions, animated: true, dasharray: '0', strokeWidth: 2 },
            similar: { stroke: RELATIONSHIP_COLORS.similar, animated: false, dasharray: '5,5', strokeWidth: 3 },
            uses: { stroke: RELATIONSHIP_COLORS.uses, animated: false, dasharray: '0', strokeWidth: 2 },
            implements: { stroke: RELATIONSHIP_COLORS.implements, animated: false, dasharray: '5,5', strokeWidth: 2 },
            extends: { stroke: RELATIONSHIP_COLORS.extends, animated: false, dasharray: '0', strokeWidth: 3 },
            depends_on: { stroke: RELATIONSHIP_COLORS.depends_on, animated: false, dasharray: '3,3', strokeWidth: 2 },
            calls: { stroke: RELATIONSHIP_COLORS.calls, animated: false, dasharray: '0', strokeWidth: 2 },
            contains: { stroke: RELATIONSHIP_COLORS.contains, animated: false, dasharray: '0', strokeWidth: 4 },
          };

          const style = relationshipStyles[rel.relationType] || relationshipStyles.uses;

          newEdges.push({
            id: rel.id, // Use the relationship ID directly (same for both directions)
            source: component.id,
            target: rel.targetId,
            sourceHandle: handlePositions.sourceHandle,
            targetHandle: handlePositions.targetHandle,
            type: edgeType, // Use selected edge type (smoothstep or default)
            animated: style.animated,
            style: {
              stroke: style.stroke,
              strokeWidth: style.strokeWidth,
              strokeDasharray: style.dasharray,
            },
            label: rel.relationType,
            labelStyle: { fontSize: 16, fill: '#cbd5e1', fontWeight: 600 },
            labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
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
  }, [docs, projectId, edgeType, setNodes, setEdges, fitView, generateDagreLayout]);

  // Initialize graph
  useEffect(() => {
    generateGraph();
  }, [generateGraph]);

  // Save node positions to localStorage when they change
  useEffect(() => {
    if (nodes.length === 0) return;

    const storageKey = `graph-layout-${projectId}`;
    const positions: Record<string, { x: number; y: number }> = {};

    nodes.forEach(node => {
      positions[node.id] = node.position;
    });

    localStorage.setItem(storageKey, JSON.stringify(positions));
  }, [nodes, projectId]);

  // Recalculate edge handle positions when nodes move
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) return;

    const updatedEdges = edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const handlePositions = getEdgeHandlePositions(sourceNode, targetNode);
        return {
          ...edge,
          sourceHandle: handlePositions.sourceHandle,
          targetHandle: handlePositions.targetHandle,
        };
      }

      return edge;
    });

    // Only update if positions actually changed
    const hasChanges = updatedEdges.some((edge, index) =>
      edge.sourceHandle !== edges[index].sourceHandle ||
      edge.targetHandle !== edges[index].targetHandle
    );

    if (hasChanges) {
      setEdges(updatedEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]); // Recalculate when nodes change position (edges intentionally excluded to avoid loops)

  // Filter nodes and edges
  const filteredNodes = useMemo(() => {
    // Extract components from nodes and filter
    const nodeComponents = nodes.map(node => (node.data as { component: BaseComponent }).component);
    const filtered = filterComponents(nodeComponents, selectedCategories, selectedFeatures, searchQuery);
    const filteredIds = new Set(filtered.map(c => c.id));

    return nodes.filter(node => filteredIds.has(node.id));
  }, [nodes, selectedCategories, selectedFeatures, searchQuery]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const handleMinimapNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Center the viewport on the clicked node
      const x = node.position.x + (node.width || 200) / 2;
      const y = node.position.y + (node.height || 150) / 2;
      setCenter(x, y, { zoom: 1, duration: 800 });

      // Also select the node
      setSelectedNode(node);
    },
    [setCenter]
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
    const storageKey = `graph-layout-${projectId}`;
    localStorage.removeItem(storageKey);
    generateGraph(false);
  }, [projectId, generateGraph]);

  // Relationship and component handlers are now in custom hooks

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

  return (
    <div className="flex flex-col lg:flex-row gap-2">
      {/* Controls Sidebar */}
      <div className="w-full lg:max-w-sm lg:w-80 bg-base-100 flex-shrink-0 space-y-2">
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
        <div className="bg-base-100 border-thick rounded-lg p-2">
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
        {/* Edge Routing Style */}
        {viewMode === 'graph' && (
          
          <div className="bg-base-100 rounded-lg">
            <div className="divider m-0"></div>
            <div className="flex">
              <button
                onClick={() => setEdgeType('smoothstep')}
                className={`btn btn-sm flex-1 ${edgeType === 'smoothstep' ? 'btn-primary' : 'btn-ghost'}`}
                style={edgeType === 'smoothstep' ? { color: getContrastTextColor('primary') } : {}}
                title="Smart routing with rounded corners"
              >
                Grid
              </button>
              <button
                onClick={() => setEdgeType('default')}
                className={`btn btn-sm flex-1 ${edgeType === 'default' ? 'btn-primary' : 'btn-ghost'}`}
                style={edgeType === 'default' ? { color: getContrastTextColor('primary') } : {}}
                title="Direct straight lines"
              >
                Smooth
              </button>
            </div>
          </div>
        )}
      </div>
        </div>


      {/* Main Content Area - Graph or Cards */}
      <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] lg:flex-1 relative">
        {viewMode === 'graph' ? (
          /* Graph Canvas */
          <div className="w-full h-full bg-base-200 rounded-lg border border-thick border-base-content/20 overflow-hidden">
            <ReactFlow
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  const component = (node.data as { component: BaseComponent }).component;
                  return getCategoryColor(component.category);
                }}
                maskColor="rgba(0, 0, 0, 0.6)"
                onNodeClick={handleMinimapNodeClick}
                pannable
                zoomable
                style={{ cursor: 'pointer' }}
              />
            </ReactFlow>
          </div>
        ) : (
          /* Cards View */
          <div className="absolute inset-0 bg-base-200 rounded-lg border-2 border-base-content/20 overflow-y-auto p-4">
            {(() => {
              // Filter components using shared utility
              const filteredDocs = filterComponents(docs, selectedCategories, selectedFeatures, searchQuery);

              // Group by feature using shared utility
              const componentsByFeature = groupComponentsByFeature(filteredDocs);
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
                          {componentsByFeature[feature]
                            .sort((a, b) => getComponentSortPriority(a) - getComponentSortPriority(b))
                            .map(component => {
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
                                      hasDuplicates: false, // Not checking duplicates in cards view
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
                                      className="badge badge-sm p-2 border-thick font-semibold text-xs truncate max-w-full"
                                      style={{
                                        backgroundColor: categoryInfo?.color,
                                        color: 'white',
                                        borderColor: categoryInfo?.color
                                      }}
                                      title={`${component.category} - ${component.type}`}
                                    >
                                      {categoryInfo?.emoji} {component.category} - {component.type}
                                    </span>
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
        <div className="w-full lg:w-80 bg-base-100 border-2 border-base-content/20 rounded-lg p-4 space-y-3 max-h-[80vh] lg:max-h-[600px] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-base-content/60 mb-1">Selected Component</div>
              {componentEditing.isEditingComponent && componentEditing.editComponentData ? (
                <input
                  type="text"
                  value={componentEditing.editComponentData.title}
                  onChange={(e) => componentEditing.setEditComponentData({ ...componentEditing.editComponentData!, title: e.target.value })}
                  className="input input-bordered input-sm w-full font-bold"
                />
              ) : (
                <h3 className="font-bold text-lg">{selectedComponent.title}</h3>
              )}
              {selectedComponent.feature && !componentEditing.isEditingComponent && (
                <span className="badge badge-sm badge-primary mt-1">{selectedComponent.feature}</span>
              )}
              {componentEditing.isEditingComponent && componentEditing.editComponentData && (
                <input
                  type="text"
                  value={componentEditing.editComponentData.feature}
                  onChange={(e) => componentEditing.setEditComponentData({ ...componentEditing.editComponentData!, feature: e.target.value })}
                  className="input input-bordered input-sm w-full mt-1"
                  placeholder="Feature name"
                />
              )}
            </div>
            <button
              onClick={() => {
                setSelectedNode(null);
                componentEditing.setIsEditingComponent(false);
                componentEditing.setEditComponentData(null);
              }}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {componentEditing.isEditingComponent && componentEditing.editComponentData ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-semibold text-base-content/60 mb-1">Category</div>
                    <select
                      value={componentEditing.editComponentData.category}
                      onChange={(e) => {
                        const newCategory = e.target.value as ComponentCategory;
                        const types = getTypesForCategory(newCategory);
                        componentEditing.setEditComponentData({
                          ...componentEditing.editComponentData!,
                          category: newCategory,
                          type: types[0]?.value || ''
                        });
                      }}
                      className="select select-bordered select-sm w-full"
                    >
                      {getAllCategories().map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-base-content/60 mb-1">Type</div>
                    <select
                      value={componentEditing.editComponentData.type}
                      onChange={(e) => componentEditing.setEditComponentData({ ...componentEditing.editComponentData!, type: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      {getTypesForCategory(componentEditing.editComponentData.category).map(type => (
                        <option key={type.value} value={type.value}>
                          {type.emoji} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-base-content/60 mb-1">Content</div>
                  <textarea
                    value={componentEditing.editComponentData.content}
                    onChange={(e) => componentEditing.setEditComponentData({ ...componentEditing.editComponentData!, content: e.target.value })}
                    className="textarea textarea-bordered textarea-sm w-full h-32"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-xs font-semibold text-base-content/60">Category & Type</div>
                  <div className="text-sm">
                    {getAllCategories().find(c => c.value === selectedComponent.category)?.emoji} {selectedComponent.category} • {selectedComponent.type}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-base-content/60">Content</div>
                  <div className="text-sm bg-base-200 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {selectedComponent.content}
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-base-content/60">
              Created: {new Date(selectedComponent.createdAt).toLocaleDateString()} • Updated: {new Date(selectedComponent.updatedAt).toLocaleDateString()}
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

                    const isEditing = relationshipManagement.editingRelationshipId === rel.id;

                    return (
                      <div key={rel.id} className="bg-base-200 p-2 rounded space-y-1">
                        {isEditing ? (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-medium truncate">{targetComponent.title}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={relationshipManagement.handleSaveRelationship}
                                  className="btn btn-ghost btn-xs text-success"
                                  title="Save changes"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={relationshipManagement.handleCancelEditRelationship}
                                  className="btn btn-ghost btn-xs text-error"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <select
                              value={relationshipManagement.editRelationshipData.relationType}
                              onChange={(e) => relationshipManagement.setEditRelationshipData({ ...relationshipManagement.editRelationshipData, relationType: e.target.value as RelationshipType })}
                              className="select select-bordered select-xs w-full"
                            >
                              <option value="uses">Uses</option>
                              <option value="implements">Implements</option>
                              <option value="extends">Extends</option>
                              <option value="depends_on">Depends On</option>
                              <option value="calls">Calls</option>
                              <option value="contains">Contains</option>
                            </select>
                            <textarea
                              value={relationshipManagement.editRelationshipData.description}
                              onChange={(e) => relationshipManagement.setEditRelationshipData({ ...relationshipManagement.editRelationshipData, description: e.target.value })}
                              placeholder="Optional description..."
                              className="textarea textarea-bordered textarea-xs w-full h-12"
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className="badge badge-xs"
                                  style={{ backgroundColor: RELATIONSHIP_COLORS[rel.relationType], color: 'white', borderColor: RELATIONSHIP_COLORS[rel.relationType] }}
                                >
                                  {rel.relationType}
                                </span>
                                <span className="text-xs font-medium truncate">{targetComponent.title}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => relationshipManagement.handleEditRelationship(rel.id, rel.relationType, rel.description || '')}
                                  className="btn btn-ghost btn-xs"
                                  title="Edit relationship"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => componentEditing.setDeleteConfirmation({ isOpen: true, type: 'relationship', id: rel.id, name: targetComponent.title })}
                                  className="btn btn-ghost btn-xs text-error"
                                  title="Delete relationship"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            {rel.description && (
                              <div className="text-xs text-base-content/60 pl-1">{rel.description}</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add relationship form - collapsible */}
              <div className="border-t border-base-content/10 pt-3">
                <button
                  onClick={() => relationshipManagement.setShowAddRelationship(!relationshipManagement.showAddRelationship)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-base-content/60 hover:text-base-content transition-colors"
                >
                  <span>Add Relationship</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${relationshipManagement.showAddRelationship ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {relationshipManagement.showAddRelationship && (
                  <div className="space-y-2 mt-2">
                    {/* Target component autocomplete */}
                    <div className="form-control">
                      <input
                        type="text"
                        value={relationshipManagement.relationshipSearch}
                        onChange={(e) => relationshipManagement.setRelationshipSearch(e.target.value)}
                        placeholder="Search component..."
                        className="input input-bordered input-sm w-full"
                        list={`relationship-targets-${selectedComponent.id}`}
                      />
                      <datalist id={`relationship-targets-${selectedComponent.id}`}>
                        {docs
                          .filter(d =>
                            d.id !== selectedComponent.id &&
                            d.title.toLowerCase().includes(relationshipManagement.relationshipSearch.toLowerCase())
                          )
                          .map(d => (
                            <option key={d.id} value={d.title} />
                          ))}
                      </datalist>
                    </div>

                    {/* Relationship type selector */}
                    <select
                      value={relationshipManagement.selectedRelationType}
                      onChange={(e) => relationshipManagement.setSelectedRelationType(e.target.value as RelationshipType)}
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
                      value={relationshipManagement.relationshipDescription}
                      onChange={(e) => relationshipManagement.setRelationshipDescription(e.target.value)}
                      placeholder="Optional description..."
                      className="textarea textarea-bordered textarea-sm w-full h-16"
                    />

                    {/* Add button */}
                    <button
                      onClick={() => relationshipManagement.handleAddRelationship(relationshipManagement.relationshipSearch)}
                      disabled={relationshipManagement.isAddingRelationship || !relationshipManagement.relationshipSearch.trim()}
                      className="btn btn-sm btn-primary w-full"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      {relationshipManagement.isAddingRelationship ? 'Adding...' : 'Add Relationship'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!componentEditing.isEditingComponent ? (
            <div className="flex gap-2 pt-2 border-t border-base-content/10">
              <button
                onClick={componentEditing.handleEditComponent}
                className="btn btn-sm btn-primary flex-1"
                style={{ color: getContrastTextColor('primary') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => componentEditing.setDeleteConfirmation({ isOpen: true, type: 'component', id: selectedComponent.id, name: selectedComponent.title })}
                className="btn btn-sm btn-error btn-outline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2 border-base-content/10">
              <button
                onClick={componentEditing.handleSaveComponent}
                disabled={!componentEditing.editComponentData?.title.trim() || !componentEditing.editComponentData?.content.trim() || !componentEditing.editComponentData?.feature.trim()}
                className="btn btn-sm btn-success flex-1"
                style={{ color: getContrastTextColor('primary') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
              <button
                onClick={componentEditing.handleCancelEditComponent}
                className="btn btn-sm btn-ghost flex-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          )}
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

      {/* Confirmation Modal */}
      {componentEditing.deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">
              {componentEditing.deleteConfirmation.type === 'component' ? 'Delete Component' : 'Delete Relationship'}
            </h3>
            <p className="text-base-content/70 mb-4">
              {componentEditing.deleteConfirmation.type === 'component'
                ? `Are you sure you want to delete "${componentEditing.deleteConfirmation.name}"? This action cannot be undone.`
                : `Are you sure you want to delete the relationship to "${componentEditing.deleteConfirmation.name}"?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => componentEditing.setDeleteConfirmation({ isOpen: false, type: 'component', id: '', name: '' })}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (componentEditing.deleteConfirmation.type === 'component') {
                    componentEditing.handleDeleteComponent();
                  } else {
                    relationshipManagement.handleDeleteRelationship(componentEditing.deleteConfirmation.id);
                    componentEditing.setDeleteConfirmation({ isOpen: false, type: 'relationship', id: '', name: '' });
                  }
                }}
                className="btn btn-error"
              >
                Delete
              </button>
            </div>
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
