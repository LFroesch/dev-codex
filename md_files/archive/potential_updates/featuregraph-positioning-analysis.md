# FeaturesGraph Positioning Analysis

## Question
**Can positioning be influenced programmatically, or is it meant to be done by hand?**

## Answer
**Both!** The FeaturesGraph uses a hybrid approach that combines intelligent programmatic layout with manual override capabilities.

---

## How It Works

### 1. Programmatic Layout (Default)

The graph uses the **Dagre** algorithm for automatic hierarchical layout:

**Location**: `FeaturesGraph.tsx:312-483`

**Key Features:**
- **Hierarchical**: Components are organized in vertical tiers based on architectural category
- **Relationship-aware**: Edges influence node positioning based on semantic weight
- **Feature clustering**: Components are grouped horizontally by feature
- **Smart spacing**: Automatically calculates optimal spacing based on connection density

**Category Tiers** (top to bottom):
```
Rank 0: Documentation, Assets, Infrastructure
Rank 1: Frontend
Rank 2: API
Rank 3: Backend
Rank 4: Security
Rank 5: Database
```

**Relationship Weights** (for layout influence):
```typescript
depends_on: 7  // Strongest influence - creates clear hierarchy
uses: 4        // Moderate influence
```

**Algorithm Configuration:**
```typescript
g.setGraph({
  rankdir: 'TB',   // Top-to-bottom layout
  nodesep: 100,    // Horizontal spacing between nodes
  ranksep: 150,    // Vertical spacing between tiers
  marginx: 50,     // Graph margins
  marginy: 50
});
```

---

### 2. Manual Override (Drag & Drop)

Users can manually reposition nodes by dragging them:

**Location**: `FeaturesGraph.tsx:636-647`

**How it works:**
1. User drags a node to a new position
2. New position is saved to `localStorage` with key: `graph-layout-${projectId}`
3. On next load, manual positions override the algorithm
4. Manual positions persist across sessions

**Storage Format:**
```json
{
  "component-id-1": { "x": 450, "y": 200 },
  "component-id-2": { "x": 850, "y": 200 },
  "component-id-3": { "x": 150, "y": 600 }
}
```

**Code:**
```typescript
// Load stored positions
const storedPositions = JSON.parse(localStorage.getItem(storageKey) || '{}');

// Apply manual position if exists, otherwise use calculated position
newNodes.push({
  ...node,
  position: storedPos || node.position,  // Manual overrides algorithm
});
```

---

### 3. Reset & Regenerate

Users can reset to programmatic layout:

**Location**: `FeaturesGraph.tsx:750-754`

**Options:**
1. **Auto Layout** button (`handleAutoLayout`): Regenerates layout, preserving manual positions
2. **Reset Layout** button (`handleResetLayout`): Clears localStorage and fully regenerates

**Code:**
```typescript
const handleResetLayout = () => {
  const storageKey = `graph-layout-${projectId}`;
  localStorage.removeItem(storageKey);  // Clear manual positions
  generateGraph(false);                  // Force full regeneration
};
```

---

## Programmatic Influence Points

If you want to **programmatically influence positioning**, here are the key areas:

### 1. Category Ranking
**Location**: `FeaturesGraph.tsx:90-102`

Modify the vertical tier for specific categories:
```typescript
const getCategoryRank = (category: ComponentCategory): number => {
  const rankMap: Record<ComponentCategory, number> = {
    documentation: 0,    // Top tier
    frontend: 1,
    api: 2,
    backend: 3,
    security: 4,
    database: 5          // Bottom tier
  };
  return rankMap[category] ?? 2;
};
```

**Example change:**
```typescript
// Move security to top tier (alongside documentation)
security: 0,  // Changed from 4
```

---

### 2. Relationship Weights
**Location**: `FeaturesGraph.tsx:32-35`

Adjust how strongly different relationship types influence layout:
```typescript
const RELATIONSHIP_WEIGHTS: Record<RelationshipType, number> = {
  depends_on: 7,   // High weight = stronger hierarchy
  uses: 4,         // Lower weight = looser positioning
};
```

**Example change:**
```typescript
// Make "uses" relationships create tighter clustering
uses: 8,  // Increased from 4
```

---

### 3. Node Sizing
**Location**: `FeaturesGraph.tsx:332-345`

Node size is based on connection strength (more connections = larger node):
```typescript
const connectionStrength = calculateConnectionStrength(doc);
const baseWidth = isAreaNode ? 600 : 400;
const baseHeight = isAreaNode ? 250 : 200;

// Scale based on connections (max limits prevent huge nodes)
const width = Math.min(800, baseWidth + connectionStrength * 8);
const height = Math.min(350, baseHeight + connectionStrength * 4);
```

**Example change:**
```typescript
// Make highly connected nodes even larger
const width = Math.min(1000, baseWidth + connectionStrength * 12);  // Increased scale
const height = Math.min(400, baseHeight + connectionStrength * 6);
```

---

### 4. Horizontal Ordering
**Location**: `FeaturesGraph.tsx:400-451`

Within each tier, nodes are ordered by connectivity (connected components are placed adjacent):
```typescript
// Start with most connected component
const firstDoc = tierDocs.reduce((best, doc) => {
  const connections = (doc.relationships || []).filter(...).length;
  return connections > bestConnections ? doc : best;
});

// Then iteratively add components most connected to already-sorted ones
```

**This creates smart clustering** within tiers without manual positioning.

---

### 5. Feature Clustering
**Location**: `FeaturesGraph.tsx:505-558`

Features are laid out horizontally with automatic spacing:
```typescript
// Each feature group is positioned with offset
currentX += featureWidth + 300;  // Horizontal spacing between features
```

**Example change:**
```typescript
// Increase spacing between feature groups
currentX += featureWidth + 500;  // More breathing room
```

---

### 6. Edge Handle Positioning
**Location**: `FeaturesGraph.tsx:108-162`

Edges intelligently connect based on relative node positions:
```typescript
const getEdgeHandlePositions = (sourceNode, targetNode) => {
  // Calculate if connection should be horizontal or vertical
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  // Choose optimal connection points
  if (isHorizontal) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }
  // ...vertical logic
};
```

This ensures edges always look clean regardless of manual repositioning.

---

## Use Cases

### When to Use Programmatic Layout
- **Initial setup**: First time viewing a graph
- **Large graphs**: 20+ components where manual layout is tedious
- **Consistent architecture**: When components follow standard patterns
- **Auto-regeneration**: After bulk component additions

### When to Use Manual Layout
- **Presentation**: Fine-tuning for screenshots or demos
- **Custom groupings**: Logical groupings that don't match categories
- **Aesthetic adjustments**: Making specific flows more visible
- **One-off tweaks**: Minor adjustments to otherwise good layout

---

## Recommendations for Programmatic Enhancements

If you want to add more programmatic control:

### 1. Layout Presets
Add preset layouts (circular, force-directed, tree, etc.):
```typescript
type LayoutType = 'dagre' | 'tree' | 'circular' | 'force';

const generateLayout = (type: LayoutType) => {
  switch(type) {
    case 'dagre': return generateDagreLayout(components);
    case 'tree': return generateTreeLayout(components);
    case 'circular': return generateCircularLayout(components);
    case 'force': return generateForceLayout(components);
  }
};
```

### 2. Smart Auto-Arrange
Automatically optimize based on viewport size:
```typescript
const optimizeForViewport = (nodes: Node[], viewportWidth: number) => {
  // Calculate optimal horizontal spacing based on viewport
  const optimalColumns = Math.floor(viewportWidth / 600);
  // Rearrange nodes to fit
};
```

### 3. Relationship-Based Clustering
Group by relationship density rather than feature:
```typescript
const clusterByRelationships = (components: BaseComponent[]) => {
  // Use graph clustering algorithms (e.g., Louvain)
  // Group components with many interconnections
};
```

### 4. Saved Layouts
Let users save/load named layouts:
```typescript
const saveLayout = (name: string) => {
  localStorage.setItem(`layout-${name}-${projectId}`, JSON.stringify(positions));
};

const loadLayout = (name: string) => {
  const positions = JSON.parse(localStorage.getItem(`layout-${name}-${projectId}`));
  applyPositions(positions);
};
```

---

## Current Limitations & Opportunities

### Limitations
1. **No layout templates**: Only one algorithm (Dagre)
2. **No undo/redo**: Manual changes can't be reverted except by reset
3. **No layout animation**: Transitions are instant (except fitView)
4. **Fixed tier system**: Categories always go in same vertical order

### Opportunities
1. **Add layout options**: Tree, radial, force-directed, etc.
2. **AI-suggested layouts**: Use LLM to suggest optimal positioning based on project type
3. **Collaborative layouts**: Share manual layouts with team members
4. **Export/import layouts**: Save layouts as JSON, share across projects
5. **Layout analytics**: Track which layouts users prefer

---

## Summary

| Aspect | Programmatic | Manual | Best For |
|--------|-------------|--------|----------|
| **Initial Layout** | ✅ Dagre algorithm | ❌ | New graphs, bulk changes |
| **Fine-tuning** | ⚠️ Limited | ✅ Drag & drop | Presentations, specific flows |
| **Persistence** | ✅ Regenerates | ✅ localStorage | Consistent experience |
| **Customization** | ✅ Highly configurable | ✅ Full control | Different needs |
| **Scalability** | ✅ Handles 100+ nodes | ⚠️ Tedious for large graphs | Large projects |

**Recommendation**: Use programmatic layout for initial positioning and bulk operations, then fine-tune manually for important views/presentations. The hybrid approach gives you the best of both worlds.

---

## Quick Reference: Key Files

- **Main component**: `frontend/src/components/FeaturesGraph.tsx`
- **Node components**: `frontend/src/components/ComponentNode.tsx`, `AreaNode.tsx`
- **Dagre library**: `dagre` (installed via npm)
- **ReactFlow**: `reactflow` (provides drag-and-drop, zoom, pan)
- **Storage**: Browser localStorage (`graph-layout-${projectId}`)

---

## Code Locations Reference

| Feature | File | Lines | Description |
|---------|------|-------|-------------|
| Dagre layout algorithm | FeaturesGraph.tsx | 312-483 | Main layout calculation |
| Category ranking | FeaturesGraph.tsx | 90-102 | Vertical tier assignment |
| Relationship weights | FeaturesGraph.tsx | 32-35 | Edge influence on layout |
| Position storage | FeaturesGraph.tsx | 636-647 | Save to localStorage |
| Position loading | FeaturesGraph.tsx | 486-490 | Load from localStorage |
| Reset layout | FeaturesGraph.tsx | 750-754 | Clear and regenerate |
| Edge positioning | FeaturesGraph.tsx | 108-162 | Smart handle placement |
| Horizontal ordering | FeaturesGraph.tsx | 400-451 | Smart clustering within tiers |

---

## Conclusion

**Yes, positioning is highly programmatic** using the Dagre hierarchical layout algorithm, with **full manual override** capabilities via drag-and-drop. The system is designed to:

1. Give you intelligent defaults that work well out of the box
2. Allow customization through well-defined configuration points
3. Let users override when they need pixel-perfect control
4. Persist both programmatic and manual layouts

This hybrid approach is ideal for a graph visualization tool - automated when you need it, customizable when you want it.
