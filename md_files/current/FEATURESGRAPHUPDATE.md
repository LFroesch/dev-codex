# FeaturesGraph Enhancement Plan

## Current Setup (FeaturesGraph.tsx)
✅ **Already Implemented:**
- Dagre algorithm with hierarchical layout (lines 250-313)
- Relationship type weighting system (lines 30-67)
- Feature-based clustering (lines 325-377)
- Smart edge routing with dynamic handles (lines 74-128)
- Position persistence via localStorage

## Requested Features to Add

### 🎯 Hub Node Sizing (Priority: HIGH - Quick Win)
**What:** Make hub nodes visually larger based on connection strength
**Why:** Instantly shows important nodes in the graph

**Implementation (FeaturesGraph.tsx, line 266-270):**
```typescript
// In generateDagreLayout(), modify node creation:
components.forEach(doc => {
  const connectionStrength = calculateConnectionStrength(doc);
  const maxStrength = Math.max(...components.map(calculateConnectionStrength));
  const sizeMultiplier = 1 + (connectionStrength / maxStrength) * 0.5; // 1.0x to 1.5x size

  g.setNode(doc.id, {
    width: 400 * sizeMultiplier,
    height: 200 * sizeMultiplier,
    label: doc.title,
  });
});
```

---

### 🅲 Centered/Radial Hierarchy
**What:** Hub nodes positioned in center, less connected nodes radiate outward
**Why:** Natural "solar system" layout for hub-and-spoke architectures

**Implementation (FeaturesGraph.tsx, add new function):**
```typescript
// Add after calculateConnectionStrength (line 68)
const applyRadialHierarchy = (components: Doc[], g: dagre.graphlib.Graph) => {
  // Calculate connection strength for all nodes
  const nodesWithStrength = components.map(doc => ({
    id: doc.id,
    strength: calculateConnectionStrength(doc)
  })).sort((a, b) => b.strength - a.strength);

  // Set custom rank - higher strength = lower rank number (closer to center)
  nodesWithStrength.forEach((node, index) => {
    const totalNodes = nodesWithStrength.length;
    const rank = Math.floor((index / totalNodes) * 5); // 0-5 ranks

    g.setNode(node.id, {
      ...g.node(node.id),
      rank: rank, // Force to specific tier
    });
  });
};

// In generateDagreLayout(), after adding all nodes but before layout():
applyRadialHierarchy(components, g);
```

---

### 🅴 Edge Bundling
**What:** Group edges going in similar directions to reduce visual clutter
**Why:** Makes dense graphs with many relationships easier to read

**Implementation (FeaturesGraph.tsx, lines 398-457, modify edge creation):**
```typescript
// After creating edges, group them by direction and add offsets
const edgesByDirection = new Map<string, Edge[]>();

newEdges.forEach(edge => {
  const sourceNode = newNodes.find(n => n.id === edge.source);
  const targetNode = newNodes.find(n => n.id === edge.target);

  if (sourceNode && targetNode) {
    // Determine direction (8 directions: N, NE, E, SE, S, SW, W, NW)
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const direction = Math.round(angle / 45) * 45; // Snap to 45° increments

    const key = `${direction}`;
    if (!edgesByDirection.has(key)) edgesByDirection.set(key, []);
    edgesByDirection.get(key)!.push(edge);
  }
});

// Apply bundle offset to edges in same direction
edgesByDirection.forEach(bundleEdges => {
  bundleEdges.forEach((edge, index) => {
    const offset = (index - bundleEdges.length / 2) * 5; // Spread edges
    edge.style = {
      ...edge.style,
      strokeDashoffset: offset,
    };
  });
});
```

---

### 🅶 Force-Directed Sub-Clustering
**What:** Hybrid approach - Dagre for macro layout, force simulation for micro-clustering within features
**Why:** More organic feel while keeping overall structure

**Implementation (FeaturesGraph.tsx, after line 365):**
```typescript
// After Dagre layout for each feature, apply force-based adjustment
const applyForceClusteringToFeature = (featureNodes: Node[], featureCenterX: number, featureCenterY: number) => {
  const maxStrength = Math.max(...featureNodes.map(n =>
    calculateConnectionStrength((n.data as any).component)
  ));

  return featureNodes.map(node => {
    const component = (node.data as any).component as Doc;
    const strength = calculateConnectionStrength(component);
    const pullToCenter = strength / maxStrength;

    // Move highly connected nodes toward feature center
    const adjustedX = node.position.x + (featureCenterX - node.position.x) * pullToCenter * 0.2;
    const adjustedY = node.position.y + (featureCenterY - node.position.y) * pullToCenter * 0.2;

    return {
      ...node,
      position: { x: adjustedX, y: adjustedY }
    };
  });
};

// Apply in feature clustering loop (around line 342-366):
features.forEach(feature => {
  const featureComponents = componentsByFeature[feature];
  let featureNodes = generateDagreLayout(featureComponents, 'feature');

  // Calculate feature center
  const avgX = featureNodes.reduce((sum, n) => sum + n.position.x, 0) / featureNodes.length;
  const avgY = featureNodes.reduce((sum, n) => sum + n.position.y, 0) / featureNodes.length;

  // Apply force clustering
  featureNodes = applyForceClusteringToFeature(featureNodes, avgX, avgY);

  // ... rest of feature clustering logic
});
```

---

### 🅷 Customizable Ranking Function
**What:** Force nodes into specific tiers based on category (frontend → api → backend → database)
**Why:** Clear architectural layer visualization

**Implementation (FeaturesGraph.tsx, add new function):**
```typescript
// Add after calculateConnectionStrength (line 68)
const getArchitecturalRank = (doc: Doc): number | undefined => {
  // Lower rank = higher in graph (top layer)
  const rankMap: Record<ComponentCategory, number> = {
    'frontend': 0,
    'api': 1,
    'backend': 2,
    'database': 3,
    'infrastructure': 4,
    'security': 2, // Same level as backend
    'documentation': 5, // Bottom
    'asset': 5,
  };
  return rankMap[doc.category];
};

// In generateDagreLayout(), modify node creation (line 265):
components.forEach(doc => {
  const rank = getArchitecturalRank(doc);
  g.setNode(doc.id, {
    width: 400,
    height: 200,
    label: doc.title,
    ...(rank !== undefined && { rank }), // Apply custom rank if available
  });
});
```

---

### 🅸 Interactive Layout Controls
**What:** UI sliders for real-time spacing adjustment
**Why:** Experiment with layouts without code changes

**Implementation (GraphControls.tsx, add new controls section):**
```typescript
// Add state to FeaturesGraph.tsx (around line 152):
const [nodeSep, setNodeSep] = useState(100);
const [rankSep, setRankSep] = useState(150);

// Modify generateDagreLayout to use state values (line 256):
g.setGraph({
  rankdir: mode === 'type' ? 'LR' : 'TB',
  nodesep: nodeSep,  // Use state value
  ranksep: rankSep,  // Use state value
  marginx: 50,
  marginy: 50,
});

// Add to GraphControls.tsx after line 215:
<div className="bg-base-100 border-thick rounded-lg p-3 sm:p-4">
  <div className="text-xs font-semibold text-base-content/60 mb-3">Layout Spacing</div>

  <div className="space-y-3">
    <div>
      <label className="text-xs text-base-content/60">Node Spacing: {nodeSep}px</label>
      <input
        type="range"
        min="50"
        max="200"
        value={nodeSep}
        onChange={(e) => {
          setNodeSep(Number(e.target.value));
          onAutoLayout(); // Trigger re-layout
        }}
        className="range range-xs"
      />
    </div>

    <div>
      <label className="text-xs text-base-content/60">Rank Spacing: {rankSep}px</label>
      <input
        type="range"
        min="80"
        max="300"
        value={rankSep}
        onChange={(e) => {
          setRankSep(Number(e.target.value));
          onAutoLayout();
        }}
        className="range range-xs"
      />
    </div>
  </div>
</div>
```

**Props to pass:** Add `nodeSep`, `setNodeSep`, `rankSep`, `setRankSep` to GraphControls props (line 9-22 in GraphControls.tsx).

---

### 🅻 Multi-Root Layout
**What:** Detect disconnected graph components and lay them out separately
**Why:** Clean separation of unrelated component clusters

**Implementation (FeaturesGraph.tsx, add new functions):**
```typescript
// Add helper function to find connected components
const findConnectedComponents = (docs: Doc[]): Doc[][] => {
  const visited = new Set<string>();
  const components: Doc[][] = [];

  const dfs = (docId: string, component: Doc[]) => {
    if (visited.has(docId)) return;
    visited.add(docId);

    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    component.push(doc);

    // Visit all connected nodes
    doc.relationships?.forEach(rel => {
      dfs(rel.targetId, component);
    });

    // Also check reverse relationships
    docs.forEach(d => {
      if (d.relationships?.some(r => r.targetId === docId)) {
        dfs(d.id, component);
      }
    });
  };

  docs.forEach(doc => {
    if (!visited.has(doc.id)) {
      const component: Doc[] = [];
      dfs(doc.id, component);
      components.push(component);
    }
  });

  return components;
};

// Modify generateGraph to use multi-root layout (replace lines 316-396):
const components = findConnectedComponents(docs);
let currentY = 0;

components.forEach(componentDocs => {
  const subgraphNodes = generateDagreLayout(componentDocs, layoutMode);

  // Calculate height of this subgraph
  const maxY = Math.max(...subgraphNodes.map(n => n.position.y + 200));
  const minY = Math.min(...subgraphNodes.map(n => n.position.y));
  const height = maxY - minY;

  // Offset vertically
  subgraphNodes.forEach(node => {
    const storedPos = storedPositions[node.id];
    newNodes.push({
      ...node,
      position: storedPos || {
        x: node.position.x,
        y: node.position.y + currentY
      },
    });
  });

  currentY += height + 300; // Gap between disconnected components
});
```

---

## Implementation Checklist

### Phase 1: Quick Wins (30 min)
- [ ] **Hub node sizing** - Bigger nodes for important components
- [ ] **Interactive sliders** - Real-time spacing controls
- [ ] **Architectural ranking** - Force category-based tiers

### Phase 2: Visual Polish (1-2 hours)
- [ ] **Centered hierarchy** - Hub nodes in center
- [ ] **Edge bundling** - Cleaner edge routing
- [ ] **Multi-root layout** - Separate disconnected components

### Phase 3: Advanced (2-3 hours)
- [ ] **Force sub-clustering** - Organic feel within features
- [ ] **Edge thickness by weight** - Visual relationship hierarchy
- [ ] **Enhanced minimap colors** - Show node importance

---

## Testing Strategy

1. **Test with various graph sizes:**
   - Small (< 20 nodes)
   - Medium (20-50 nodes)
   - Large (50+ nodes)

2. **Test with different relationship densities:**
   - Sparse (avg 1-2 relationships per node)
   - Medium (avg 3-5 relationships)
   - Dense (avg 5+ relationships)

3. **Test architectural scenarios:**
   - Pure frontend components
   - Full stack (frontend → api → backend → db)
   - Mixed/flat architectures

4. **Verify localStorage persistence still works**
5. **Check performance with large graphs (50+ nodes)**

---

## Expected Results

✅ **Hub nodes are 1.5x larger** - Immediately visible importance
✅ **Important nodes cluster in center** - Natural focal points
✅ **Edges are cleaner** - Bundling reduces visual spaghetti
✅ **Architectural layers are clear** - Frontend at top, DB at bottom
✅ **Spacing is tunable** - Find optimal layout for your data
✅ **Disconnected components separated** - Clear visual distinction
✅ **Organic clustering** - More natural feel within features

---

## Code Locations Reference

**FeaturesGraph.tsx:**
- Line 30-67: Relationship weights & connection strength
- Line 74-128: Edge handle positioning
- Line 250-313: `generateDagreLayout()` - main layout function
- Line 325-377: Feature clustering logic
- Line 398-457: Edge creation

**GraphControls.tsx:**
- Line 1-6: Imports
- Line 70-154: Create component section
- Line 183-215: Action buttons
- Line 232-275: Category filters
