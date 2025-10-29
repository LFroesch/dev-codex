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
  Panel,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Doc, projectAPI } from '../api';
import { ComponentCategory, CreateComponentData, RelationshipType, ComponentRelationship } from '../../../shared/types/project';
import ComponentNode from './ComponentNode';
import AreaNode from './AreaNode';
import GraphControls from './GraphControls';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { getAllCategories, getCategoryColor, getTypesForCategory } from '../config/componentCategories';

// Define nodeTypes outside component to prevent recreation and React Flow warnings
const NODE_TYPES = {
  componentNode: ComponentNode,
  areaNode: AreaNode,
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
  const [edgeType, setEdgeType] = useState<'smoothstep' | 'default'>(() => {
    const stored = localStorage.getItem('graph-edge-type');
    return (stored === 'smoothstep' || stored === 'default') ? stored : 'smoothstep';
  });
  const { fitView, setCenter } = useReactFlow();

  // Relationship management state
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<RelationshipType>('uses');
  const [relationshipDescription, setRelationshipDescription] = useState('');
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);

  // Relationship editing state
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editRelationshipData, setEditRelationshipData] = useState<{
    relationType: RelationshipType;
    description: string;
  }>({ relationType: 'uses', description: '' });

  // Component editing and deletion state
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [editComponentData, setEditComponentData] = useState<{
    category: ComponentCategory;
    type: string;
    title: string;
    content: string;
    feature: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'component' | 'relationship';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'component', id: '', name: '' });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
        const currentComponent = (selectedNode.data as any).component as Doc;
        if (JSON.stringify(currentComponent.relationships) !== JSON.stringify(updatedComponent.relationships) ||
            currentComponent.updatedAt !== updatedComponent.updatedAt) {
          setSelectedNode(newNode);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Calculate columns per feature based on component count
      const getColumnsForFeature = (componentCount: number) => {
        if (componentCount <= 2) return 1;
        if (componentCount <= 6) return 2;
        if (componentCount <= 12) return 3;
        return 4;
      };

      const horizontalNodeSpacing = 650; // Space between nodes horizontally (increased)
      const verticalNodeSpacing = 350; // Space between nodes vertically (increased)
      const featurePadding = 600; // Padding between features (generous)
      const rowSpacing = 400; // Extra spacing between rows of features

      // Calculate width for each feature based on its column count
      const featureWidths = features.map(feature => {
        const componentCount = componentsByFeature[feature].length;
        const columns = getColumnsForFeature(componentCount);
        return columns * horizontalNodeSpacing + featurePadding;
      });

      // Calculate positions using cumulative widths (no more fixed grid)
      let currentX = 0;
      let currentY = 0;
      let currentRowMaxHeight = 0;
      let currentRowWidth = 0;
      const maxRowWidth = 3500; // Maximum width before wrapping to next row

      features.forEach((feature, featureIndex) => {
        const featureComponents = componentsByFeature[feature];
        const columnsForThisFeature = getColumnsForFeature(featureComponents.length);
        const featureWidth = featureWidths[featureIndex];

        // Check if we need to wrap to next row
        if (currentRowWidth + featureWidth > maxRowWidth && featureIndex > 0) {
          currentX = 0;
          currentY += currentRowMaxHeight + rowSpacing;
          currentRowWidth = 0;
          currentRowMaxHeight = 0;
        }

        const featureX = currentX;
        const featureY = currentY;

        // Calculate this feature's height for row tracking
        const rows = Math.ceil(featureComponents.length / columnsForThisFeature);
        const featureHeight = rows * verticalNodeSpacing;
        currentRowMaxHeight = Math.max(currentRowMaxHeight, featureHeight);

        // Move X position for next feature
        currentX += featureWidth;
        currentRowWidth += featureWidth;

        // Sort components by relationship count (most connected first) for better visual organization
        const sortedComponents = [...featureComponents].sort((a, b) => {
          const aConnections = (a.relationships || []).length;
          const bConnections = (b.relationships || []).length;
          if (aConnections !== bConnections) {
            return bConnections - aConnections; // Most connected first
          }
          return a.title.localeCompare(b.title); // Alphabetical tiebreaker
        });

        sortedComponents.forEach((component, componentIndex) => {
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          // Check for similar relationships (potential duplicates)
          const hasDuplicates = (component.relationships || []).some(
            rel => rel.relationType === 'similar'
          );

          const storedPos = storedPositions[component.id];
          const defaultX = featureX + (componentIndex % columnsForThisFeature) * horizontalNodeSpacing;
          const defaultY = featureY + Math.floor(componentIndex / columnsForThisFeature) * verticalNodeSpacing;

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

      // Calculate dynamic columns per type based on component count
      const getColumnsForType = (componentCount: number) => {
        if (componentCount <= 3) return 1;
        if (componentCount <= 8) return 2;
        if (componentCount <= 16) return 3;
        return 4;
      };

      const horizontalNodeSpacing = 650; // Space between nodes in same type (increased)
      const verticalNodeSpacing = 350; // Space between nodes vertically (increased)
      const typePadding = 600; // Padding between type groups (generous)

      // Calculate width for each type based on its column count
      const typeWidths = types.map(type => {
        const componentCount = componentsByType[type].length;
        const columns = getColumnsForType(componentCount);
        return columns * horizontalNodeSpacing + typePadding;
      });

      // Calculate positions using cumulative widths
      let currentX = 0;

      types.forEach((type, typeIndex) => {
        const typeComponents = componentsByType[type];
        const columnsForThisType = getColumnsForType(typeComponents.length);
        const typeX = currentX;

        // Move X position for next type
        currentX += typeWidths[typeIndex];

        // Sort components by relationship count (most connected first) for better visual organization
        const sortedComponents = [...typeComponents].sort((a, b) => {
          const aConnections = (a.relationships || []).length;
          const bConnections = (b.relationships || []).length;
          if (aConnections !== bConnections) {
            return bConnections - aConnections; // Most connected first
          }
          return a.title.localeCompare(b.title); // Alphabetical tiebreaker
        });

        sortedComponents.forEach((component, componentIndex) => {
          const isRecent = new Date(component.updatedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
          const isStale = new Date(component.updatedAt).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
          const isIncomplete = component.content.length < 100;
          const isOrphaned = !component.feature;

          // Check for similar relationships (potential duplicates)
          const hasDuplicates = (component.relationships || []).some(
            rel => rel.relationType === 'similar'
          );

          const storedPos = storedPositions[component.id];
          const defaultX = typeX + (componentIndex % columnsForThisType) * horizontalNodeSpacing;
          const defaultY = Math.floor(componentIndex / columnsForThisType) * verticalNodeSpacing;

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

          // Calculate dynamic handle positions based on node positions
          const handlePositions = getEdgeHandlePositions(sourceExists, targetExists);

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
            sourceHandle: handlePositions.sourceHandle,
            targetHandle: handlePositions.targetHandle,
            type: edgeType, // Use selected edge type (smoothstep or default)
            animated: style.animated,
            style: {
              stroke: style.stroke,
              strokeWidth: style.strokeWidth,
              strokeDasharray: style.dasharray,
            },
            pathOptions: edgeType === 'smoothstep' ? {
              offset: 20, // Offset from center for multiple edges
              borderRadius: 15 // Smooth curves at corners
            } : undefined,
            label: rel.relationType,
            labelStyle: { fontSize: 16, fill: '#cbd5e1', fontWeight: 600 },
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
  }, [docs, projectId, layoutMode, edgeType, setNodes, setEdges, fitView]);

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
      setDeleteConfirmation({ isOpen: false, type: 'relationship', id: '', name: '' });

      // Refresh data from parent to get updated relationships
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      setToast({ message: 'Failed to delete relationship', type: 'error' });
    }
  }, [selectedNode, projectId, onRefresh]);

  const handleEditRelationship = useCallback((relationshipId: string, relationType: RelationshipType, description: string) => {
    setEditingRelationshipId(relationshipId);
    setEditRelationshipData({ relationType, description: description || '' });
  }, []);

  const handleSaveRelationship = useCallback(async () => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent || !editingRelationshipId) return;

    // For now, we need to delete and recreate the relationship since there's no update endpoint
    // Find the relationship to get the target
    const relationship = selectedComponent.relationships?.find(r => r.id === editingRelationshipId);
    if (!relationship) return;

    try {
      // Delete old relationship
      await projectAPI.deleteRelationship(projectId, selectedComponent.id, editingRelationshipId);

      // Create new relationship with updated data
      await projectAPI.createRelationship(projectId, selectedComponent.id, {
        targetId: relationship.targetId,
        relationType: editRelationshipData.relationType,
        description: editRelationshipData.description || undefined,
      });

      setToast({ message: 'Relationship updated', type: 'success' });
      setEditingRelationshipId(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to update relationship:', error);
      setToast({ message: 'Failed to update relationship', type: 'error' });
    }
  }, [selectedNode, editingRelationshipId, editRelationshipData, projectId, onRefresh]);

  const handleCancelEditRelationship = useCallback(() => {
    setEditingRelationshipId(null);
    setEditRelationshipData({ relationType: 'uses', description: '' });
  }, []);

  const handleEditComponent = useCallback(() => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent) return;

    setIsEditingComponent(true);
    setEditComponentData({
      category: selectedComponent.category,
      type: selectedComponent.type,
      title: selectedComponent.title,
      content: selectedComponent.content,
      feature: selectedComponent.feature || '',
    });
  }, [selectedNode]);

  const handleSaveComponent = useCallback(async () => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent || !editComponentData) return;

    try {
      await projectAPI.updateComponent(projectId, selectedComponent.id, editComponentData);

      setToast({ message: 'Component updated', type: 'success' });
      setIsEditingComponent(false);
      setEditComponentData(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to update component:', error);
      setToast({ message: 'Failed to update component', type: 'error' });
    }
  }, [selectedNode, editComponentData, projectId, onRefresh]);

  const handleCancelEditComponent = useCallback(() => {
    setIsEditingComponent(false);
    setEditComponentData(null);
  }, []);

  const handleDeleteComponent = useCallback(async () => {
    const selectedComponent = selectedNode ? (selectedNode.data as any).component as Doc : null;
    if (!selectedComponent) return;

    try {
      await projectAPI.deleteComponent(projectId, selectedComponent.id);

      setToast({ message: 'Component deleted', type: 'success' });
      setDeleteConfirmation({ isOpen: false, type: 'component', id: '', name: '' });
      setSelectedNode(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete component:', error);
      setToast({ message: 'Failed to delete component', type: 'error' });
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
      <div className="w-full max-w-sm md:w-80 bg-base-100 flex-shrink-0 space-y-4">
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
          <>
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

            {/* Edge Routing Style */}
            <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4">
              <div className="text-xs font-semibold text-base-content/60 mb-2">Edge Routing</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEdgeType('smoothstep')}
                  className={`btn btn-sm flex-1 ${edgeType === 'smoothstep' ? 'btn-primary' : 'btn-ghost'}`}
                  style={edgeType === 'smoothstep' ? { color: getContrastTextColor('primary') } : {}}
                  title="Smart routing with rounded corners"
                >
                  Smart
                </button>
                <button
                  onClick={() => setEdgeType('default')}
                  className={`btn btn-sm flex-1 ${edgeType === 'default' ? 'btn-primary' : 'btn-ghost'}`}
                  style={edgeType === 'default' ? { color: getContrastTextColor('primary') } : {}}
                  title="Direct straight lines"
                >
                  Direct
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area - Graph or Cards */}
      <div className="flex-1 h-[300px] sm:h-[400px] lg:h-[600px] relative">
        {viewMode === 'graph' ? (
          /* Graph Canvas */
          <div className="absolute inset-0 bg-base-200 rounded-lg border-2 border-base-content/20 overflow-hidden">
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
                  const component = (node.data as any).component as Doc;
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
              {isEditingComponent && editComponentData ? (
                <input
                  type="text"
                  value={editComponentData.title}
                  onChange={(e) => setEditComponentData({ ...editComponentData, title: e.target.value })}
                  className="input input-bordered input-sm w-full font-bold"
                />
              ) : (
                <h3 className="font-bold text-lg">{selectedComponent.title}</h3>
              )}
              {selectedComponent.feature && !isEditingComponent && (
                <span className="badge badge-sm badge-primary mt-1">{selectedComponent.feature}</span>
              )}
              {isEditingComponent && editComponentData && (
                <input
                  type="text"
                  value={editComponentData.feature}
                  onChange={(e) => setEditComponentData({ ...editComponentData, feature: e.target.value })}
                  className="input input-bordered input-sm w-full mt-1"
                  placeholder="Feature name"
                />
              )}
            </div>
            <button
              onClick={() => {
                setSelectedNode(null);
                setIsEditingComponent(false);
                setEditComponentData(null);
              }}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {isEditingComponent && editComponentData ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-semibold text-base-content/60 mb-1">Category</div>
                    <select
                      value={editComponentData.category}
                      onChange={(e) => {
                        const newCategory = e.target.value as ComponentCategory;
                        const types = getTypesForCategory(newCategory);
                        setEditComponentData({
                          ...editComponentData,
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
                      value={editComponentData.type}
                      onChange={(e) => setEditComponentData({ ...editComponentData, type: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      {getTypesForCategory(editComponentData.category).map(type => (
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
                    value={editComponentData.content}
                    onChange={(e) => setEditComponentData({ ...editComponentData, content: e.target.value })}
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
                  <div className="text-xs font-semibold text-base-content/60">Content Preview</div>
                  <div className="text-sm bg-base-200 p-2 rounded max-h-32 overflow-y-auto">
                    {selectedComponent.content.substring(0, 200)}
                    {selectedComponent.content.length > 200 && '...'}
                  </div>
                </div>
              </>
            )}

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

                    const isEditing = editingRelationshipId === rel.id;

                    return (
                      <div key={rel.id} className="bg-base-200 p-2 rounded space-y-1">
                        {isEditing ? (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-medium truncate">{targetComponent.title}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={handleSaveRelationship}
                                  className="btn btn-ghost btn-xs text-success"
                                  title="Save changes"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEditRelationship}
                                  className="btn btn-ghost btn-xs text-error"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <select
                              value={editRelationshipData.relationType}
                              onChange={(e) => setEditRelationshipData({ ...editRelationshipData, relationType: e.target.value as RelationshipType })}
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
                              value={editRelationshipData.description}
                              onChange={(e) => setEditRelationshipData({ ...editRelationshipData, description: e.target.value })}
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
                                  style={{ backgroundColor: relationshipColors[rel.relationType], color: 'white', borderColor: relationshipColors[rel.relationType] }}
                                >
                                  {rel.relationType}
                                </span>
                                <span className="text-xs font-medium truncate">{targetComponent.title}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditRelationship(rel.id, rel.relationType, rel.description || '')}
                                  className="btn btn-ghost btn-xs"
                                  title="Edit relationship"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmation({ isOpen: true, type: 'relationship', id: rel.id, name: targetComponent.title })}
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

          {!isEditingComponent ? (
            <div className="flex gap-2 pt-2 border-t border-base-content/10">
              <button
                onClick={handleEditComponent}
                className="btn btn-sm btn-primary flex-1"
                style={{ color: getContrastTextColor('primary') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirmation({ isOpen: true, type: 'component', id: selectedComponent.id, name: selectedComponent.title })}
                className="btn btn-sm btn-error btn-outline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-base-content/10">
              <button
                onClick={handleSaveComponent}
                disabled={!editComponentData?.title.trim() || !editComponentData?.content.trim() || !editComponentData?.feature.trim()}
                className="btn btn-sm btn-success flex-1"
                style={{ color: getContrastTextColor('primary') }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
              <button
                onClick={handleCancelEditComponent}
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
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">
              {deleteConfirmation.type === 'component' ? 'Delete Component' : 'Delete Relationship'}
            </h3>
            <p className="text-base-content/70 mb-4">
              {deleteConfirmation.type === 'component'
                ? `Are you sure you want to delete "${deleteConfirmation.name}"? This action cannot be undone.`
                : `Are you sure you want to delete the relationship to "${deleteConfirmation.name}"?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, type: 'component', id: '', name: '' })}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmation.type === 'component') {
                    handleDeleteComponent();
                  } else {
                    handleDeleteRelationship(deleteConfirmation.id);
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
