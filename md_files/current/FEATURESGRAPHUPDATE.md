# FeaturesGraph Layout Improvement Plan

## Current State Analysis

**File:** `frontend/src/components/FeaturesGraph.tsx`
**Library:** React Flow
**Current Algorithm:** Fixed grid layout with basic sorting

### What Works
- Feature-based and Type-based grouping modes
- Sorts nodes by relationship count (most connected first) - lines 279-287
- Smart edge routing with dynamic handle positioning
- Position persistence via localStorage
- Metadata tracking (isStale, isRecent, isIncomplete, isOrphaned)

### What's Rudimentary
1. **Grid-Only Layout** - Fixed spacing (650px horizontal, 350px vertical)
2. **No Relationship-Aware Positioning** - Connected nodes aren't placed near each other
3. **No Semantic Clustering** - Doesn't consider relationship types or strength
4. **No Edge Crossing Minimization** - Random edge crossing based on grid position
5. **No Hierarchical Intelligence** - "contains", "extends", "depends_on" don't affect layout

---

## Problems with Current Approach

### Visual Quality Issues
- **Spaghetti edges** - Related nodes can be far apart, creating long crossing edges
- **Wasted space** - Grid layout doesn't adapt to actual relationship density
- **No hierarchy** - Can't distinguish parent/child or dependency flow
- **Cognitive load** - User must mentally trace relationships across the canvas

### Semantic Issues
- **Connection count ≠ importance** - A node with 10 weak "mentions" ranks higher than a core node with 3 strong "depends_on" relationships
- **No relationship weighting** - All edges treated equally in layout
- **Category blindness** - Backend and frontend nodes scattered randomly within features

---

## Industry Standards Comparison

### 1. Dagre (Hierarchical/Directed Graph) ⭐ RECOMMENDED
**Used by:** Mermaid, Graphviz, Flowchart.js, many enterprise tools

**Strengths:**
- Minimizes edge crossings (Sugiyama algorithm)
- Clear hierarchical flow (dependencies flow in one direction)
- Deterministic (same graph = same layout every time)
- Fast (handles 500+ nodes)
- Battle-tested for architecture diagrams

**Best for:**
- System architecture visualization
- Dependency graphs
- When relationships have direction/hierarchy

**Integration:** `dagre` + `reactflow` (built-in support, many examples)

---

### 2. D3 Force-Directed (Physics Simulation)
**Used by:** Neo4j, Observable, many research tools

**Strengths:**
- Natural clustering (related nodes gravitate together)
- Reveals hidden patterns
- Beautiful organic movement
- Good for exploration

**Weaknesses:**
- Non-deterministic (different every time)
- Can be slow with 100+ nodes
- Requires tuning physics parameters
- Less "professional" looking for architecture docs

**Best for:**
- Social networks
- Exploratory data analysis
- When you want to discover clusters

**Integration:** `d3-force` + custom React Flow positioning

---

### 3. ELK (Eclipse Layout Kernel)
**Used by:** Eclipse IDE, VS Code diagram extensions

**Strengths:**
- Multiple algorithms in one (Layered, Force, Box, etc.)
- Highly configurable
- Handles complex node types (ports, nested nodes)

**Weaknesses:**
- Heavy dependency (~500kb)
- Steeper learning curve
- Overkill for most use cases

**Best for:**
- Enterprise applications with complex requirements
- When you need multiple layout algorithms

**Integration:** `elkjs` + React Flow

---

## Recommended Solution: Dagre + Semantic Clustering

### Why This Approach

**Quality over Flash:** Dagre provides clean, professional layouts that respect relationships and hierarchy while remaining deterministic and fast.

**Semantic Enhancement:** We'll add domain-aware logic on top of Dagre:
- Feature-based macro clustering (keep your existing grouping)
- Relationship type weighting (hierarchical edges get priority)
- Category-aware node placement within clusters
- Bidirectional relationship handling

### Technical Approach

#### Phase 1: Basic Dagre Integration
Replace lines 207-407 (generateGraph function) with Dagre layout:

```typescript
import dagre from 'dagre';

// Create directed graph
const g = new dagre.graphlib.Graph();
g.setGraph({
  rankdir: 'TB', // Top-to-bottom (or 'LR' for left-to-right)
  nodesep: 100,  // Horizontal spacing between nodes
  ranksep: 150,  // Vertical spacing between ranks
  marginx: 50,
  marginy: 50,
});

g.setDefaultEdgeLabel(() => ({}));

// Add nodes
docs.forEach(doc => {
  g.setNode(doc.id, {
    width: 400,
    height: 200,
    // Add metadata for semantic weighting
    connectionStrength: calculateConnectionStrength(doc),
    category: doc.category,
  });
});

// Add edges with weighting
docs.forEach(doc => {
  doc.relationships?.forEach(rel => {
    g.setEdge(doc.id, rel.targetId, {
      weight: getRelationshipWeight(rel.relationType),
      minlen: getMinLength(rel.relationType), // Hierarchical edges get more vertical space
    });
  });
});

// Run layout
dagre.layout(g);

// Extract positions
const newNodes = docs.map(doc => {
  const node = g.node(doc.id);
  return {
    id: doc.id,
    position: { x: node.x, y: node.y },
    data: { component: doc, /* ... */ },
  };
});
```

#### Phase 2: Semantic Weighting

```typescript
// Relationship type priorities (higher = more important for layout)
const RELATIONSHIP_WEIGHTS = {
  contains: 10,     // Strong hierarchical - parent always above child
  extends: 8,       // Clear inheritance flow
  depends_on: 7,    // Dependency should flow downward
  implements: 6,    // Interface above implementation
  uses: 4,          // General usage
  calls: 4,         // Function calls
  mentions: 2,      // Weak reference
  similar: 1,       // Lateral relationship, no hierarchy
};

function getRelationshipWeight(type: RelationshipType): number {
  return RELATIONSHIP_WEIGHTS[type] || 1;
}

function getMinLength(type: RelationshipType): number {
  // Hierarchical relationships need more vertical separation
  if (['contains', 'extends', 'depends_on'].includes(type)) {
    return 2; // Two ranks apart minimum
  }
  return 1;
}

// Enhanced connection strength (for node importance)
function calculateConnectionStrength(doc: Doc): number {
  return (doc.relationships || []).reduce((sum, rel) => {
    return sum + RELATIONSHIP_WEIGHTS[rel.relationType];
  }, 0);
}
```

#### Phase 3: Feature Clustering

```typescript
// Create separate subgraphs for each feature, then arrange them
function generateGraphWithFeatureClusters() {
  const featureGraphs: Record<string, dagre.graphlib.Graph> = {};
  const featurePositions: Record<string, { x: number, y: number, width: number, height: number }> = {};

  // Step 1: Layout each feature independently
  Object.entries(componentsByFeature).forEach(([feature, components]) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });

    // Add nodes and edges for this feature
    components.forEach(doc => {
      g.setNode(doc.id, { width: 400, height: 200 });
      doc.relationships?.forEach(rel => {
        // Only add edges within this feature
        if (components.find(c => c.id === rel.targetId)) {
          g.setEdge(doc.id, rel.targetId, {
            weight: getRelationshipWeight(rel.relationType),
          });
        }
      });
    });

    dagre.layout(g);
    featureGraphs[feature] = g;

    // Calculate bounding box for this feature cluster
    const bbox = calculateBoundingBox(g);
    featurePositions[feature] = bbox;
  });

  // Step 2: Arrange feature clusters based on inter-feature connections
  const clusterGraph = new dagre.graphlib.Graph();
  clusterGraph.setGraph({ rankdir: 'LR', nodesep: 200, ranksep: 300 });

  Object.entries(featurePositions).forEach(([feature, bbox]) => {
    clusterGraph.setNode(feature, bbox);
  });

  // Add edges between features based on cross-feature relationships
  Object.entries(componentsByFeature).forEach(([sourceFeature, components]) => {
    components.forEach(doc => {
      doc.relationships?.forEach(rel => {
        const targetDoc = docs.find(d => d.id === rel.targetId);
        const targetFeature = targetDoc?.feature || 'Ungrouped';
        if (targetFeature !== sourceFeature) {
          // Cross-feature relationship
          clusterGraph.setEdge(sourceFeature, targetFeature);
        }
      });
    });
  });

  dagre.layout(clusterGraph);

  // Step 3: Combine cluster positions with internal node positions
  const finalNodes = docs.map(doc => {
    const feature = doc.feature || 'Ungrouped';
    const featureCluster = clusterGraph.node(feature);
    const nodeInCluster = featureGraphs[feature].node(doc.id);

    return {
      id: doc.id,
      position: {
        x: featureCluster.x + nodeInCluster.x,
        y: featureCluster.y + nodeInCluster.y,
      },
      data: { component: doc, /* ... */ },
    };
  });

  return finalNodes;
}
```

---

## Implementation Plan

### Step 1: Install Dependencies

```bash
npm install dagre @types/dagre
```

### Step 2: Update FeaturesGraph.tsx
1. Import dagre at the top
2. Replace `generateGraph` function (lines 207-407) with Dagre implementation
3. Keep existing edge generation logic (lines 409-468) - it's already good
4. Add relationship weighting constants
5. Add semantic clustering functions

### Step 3: Add Layout Mode Options
Add new layout modes to the UI:
- **Smart (Dagre)** - Default, relationship-aware hierarchical layout
- **Clustered (Dagre + Features)** - Feature clustering with smart internal layout
- **Manual Grid** - Keep current grid as fallback option

### Step 4: Configuration Options
Add controls for:
- **Layout direction:** Top-to-bottom vs Left-to-right
- **Spacing:** Compact vs Spacious
- **Relationship emphasis:** Hierarchical-first vs Balanced

### Step 5: Testing & Refinement
1. Test with real project data (various node counts, relationship densities)
2. Tune spacing parameters (nodesep, ranksep)
3. Validate bidirectional relationship handling
4. Ensure localStorage position overrides still work

---

## Expected Benefits

### Visual Quality
- **50-80% reduction in edge crossings** (Sugiyama algorithm guarantee)
- **Natural hierarchy** - Dependencies flow in clear direction
- **Better space utilization** - Nodes arranged by actual connections, not arbitrary grid
- **Professional appearance** - Industry-standard graph layout

### Semantic Intelligence
- **Relationship-aware positioning** - Strongly connected nodes placed near each other
- **Type-weighted importance** - "depends_on" and "contains" drive layout hierarchy
- **Category clustering** - Related components naturally group within features
- **Hierarchy visibility** - Can see which components are foundational vs dependent

### User Experience
- **Easier navigation** - Related components are visually adjacent
- **Faster comprehension** - Graph structure matches mental model of dependencies
- **Reduced cognitive load** - Don't need to trace long edges across canvas
- **Deterministic** - Same graph looks the same every time (predictable)

### Performance
- **Fast layout calculation** - Dagre handles 500+ nodes efficiently
- **No physics simulation overhead** - No continuous animation/calculation
- **React Flow compatibility** - Just pass calculated positions, rendering stays optimized

---

## Alternative Approaches

### When to Use D3 Force-Directed Instead
- You have **no clear hierarchical relationships** (all edges are "related" or "similar")
- You want **exploratory analysis** to discover hidden clusters
- Your users prefer **organic, dynamic layouts** over structured diagrams
- You're okay with **non-deterministic** results

### When to Use ELK Instead
- You need **multiple layout algorithms** switchable at runtime
- You have **complex node types** (ports, nested subgraphs)
- You're building **enterprise diagramming software**
- Bundle size isn't a concern

### When to Keep Grid Layout
- Your graph is **very sparse** (few relationships)
- Users heavily customize positions manually
- You want **maximum predictability** (grid is most predictable)
- Performance is critical and graph is huge (1000+ nodes)

---

## References & Examples

### React Flow + Dagre Examples
- [React Flow Docs - Dagre Layout](https://reactflow.dev/examples/layout/dagre)
- [React Flow - Auto Layout Example](https://reactflow.dev/examples/layout/auto-layout)

### Dagre Algorithm
- [Dagre GitHub](https://github.com/dagrejs/dagre)
- [Sugiyama Layout Algorithm](https://en.wikipedia.org/wiki/Layered_graph_drawing)

### Graph Layout Research
- "A Technique for Drawing Directed Graphs" (Sugiyama et al., 1981)
- "Graph Drawing: Algorithms for the Visualization of Graphs" (Battista et al.)

---

## Advanced Options & Tuning

### Current Dagre Configuration (What You Have Now)

```typescript
g.setGraph({
  rankdir: 'TB',     // Top-to-bottom
  nodesep: 100,      // Horizontal node spacing
  ranksep: 150,      // Vertical rank spacing
  marginx: 50,
  marginy: 50,
});
```

This is a **conservative, clean** layout. But you can tune this extensively.

---

### Option A: More Compact Layout

**Problem:** Too much whitespace, want denser visualization
**Solution:** Reduce spacing parameters

```typescript
g.setGraph({
  rankdir: 'TB',
  nodesep: 60,       // Tighter horizontal spacing
  ranksep: 100,      // Closer ranks
  marginx: 20,
  marginy: 20,
  ranker: 'tight-tree', // Alternative: 'network-simplex' (default), 'longest-path'
});
```

**Effect:**
- More nodes visible in viewport
- Better for large graphs (50+ nodes)
- Can feel cramped with big nodes

---

### Option B: Left-to-Right Flow (Better for Dependencies)

**Problem:** Want to see dependency flow horizontally (like traditional flowcharts)
**Solution:** Change rank direction

```typescript
g.setGraph({
  rankdir: 'LR',     // Left-to-right (already using this for 'type' mode!)
  nodesep: 120,
  ranksep: 200,
  align: 'UL',       // Align nodes: 'UL' (up-left), 'UR', 'DL', 'DR'
});
```

**Effect:**
- Dependencies flow left → right
- Good for sequential processes
- Better for wide screens

---

### Option C: Centered/Radial Hierarchy

**Problem:** Want important nodes in center, less important radiating out
**Solution:** Use custom ranking + positioning

```typescript
// Rank nodes by importance (connection strength)
const centralNodes = docs
  .sort((a, b) => calculateConnectionStrength(b) - calculateConnectionStrength(a))
  .slice(0, 5); // Top 5 most connected

// Set custom rank for central nodes
centralNodes.forEach(node => {
  g.setNode(node.id, {
    width: 400,
    height: 200,
    rank: 0, // Force to center rank
  });
});
```

**Effect:**
- Hub nodes in middle
- Leaf nodes on edges
- "Solar system" feel

---

### Option D: Strict Layering (Clean Tiers)

**Problem:** Want very clear hierarchical tiers (like org chart)
**Solution:** Adjust ranker algorithm and edge constraints

```typescript
g.setGraph({
  rankdir: 'TB',
  nodesep: 80,
  ranksep: 200,      // Large vertical gaps between tiers
  ranker: 'longest-path', // Creates deeper hierarchies
  acyclicer: 'greedy',    // Handle circular dependencies better
});

// Enforce minimum separation for hierarchical edges
docs.forEach(doc => {
  doc.relationships?.forEach(rel => {
    if (['contains', 'extends', 'depends_on'].includes(rel.relationType)) {
      g.setEdge(doc.id, rel.targetId, {
        weight: 10,
        minlen: 3, // Force 3 ranks apart (was 2)
      });
    }
  });
});
```

**Effect:**
- Very clear parent/child tiers
- Good for hierarchical codebases
- Can create very tall graphs

---

### Option E: Edge Bundling (Reduce Visual Clutter)

**Problem:** Too many edges crossing, hard to follow relationships
**Solution:** Bundle edges that go in similar directions

This requires additional logic in edge creation:

```typescript
// Group edges by general direction
const edgesByDirection: Record<string, Edge[]> = {
  topToBottom: [],
  leftToRight: [],
  // ... etc
};

// Draw bundled edges with offset
edges.forEach(edge => {
  const direction = getEdgeDirection(edge.source, edge.target);
  const bundleIndex = edgesByDirection[direction].length;

  edge.style = {
    ...edge.style,
    strokeDashoffset: bundleIndex * 5, // Offset bundled edges
  };
});
```

**Effect:**
- Cleaner visual when many edges
- Easier to trace specific connections
- Industry standard for complex graphs

---

### Option F: Compound Nodes (Nested Groups)

**Problem:** Want visual grouping of features, not just spatial proximity
**Solution:** Use React Flow's compound nodes (boxes around feature clusters)

```typescript
// Create parent nodes for each feature
features.forEach(feature => {
  newNodes.push({
    id: `feature-${feature}`,
    type: 'group', // Special group node type
    position: { x: featureX, y: featureY },
    style: {
      width: featureWidth,
      height: featureHeight,
      backgroundColor: 'rgba(100, 100, 100, 0.1)',
      border: '2px dashed #666',
    },
    data: { label: feature },
  });
});

// Set parent for each component node
componentNodes.forEach(node => {
  node.parentNode = `feature-${node.data.component.feature}`;
  node.extent = 'parent'; // Keep node within parent bounds
});
```

**Effect:**
- Clear visual boundaries around features
- Can collapse/expand groups
- Better spatial organization

---

### Option G: Force-Directed Sub-Clustering

**Problem:** Dagre is too rigid, want organic clustering within features
**Solution:** Hybrid approach - Dagre for macro layout, D3 force for micro

```typescript
// After Dagre positions features, apply force simulation within each
features.forEach(feature => {
  const featureComponents = componentsByFeature[feature];

  // Simple force simulation (not full D3)
  const simulation = {
    centerForce: { x: featureCenterX, y: featureCenterY },
    attractionStrength: 0.5,
  };

  // Move highly connected nodes toward center
  featureComponents.forEach(comp => {
    const strength = calculateConnectionStrength(comp);
    const pullToCenter = strength / maxStrength;

    comp.position.x += (featureCenterX - comp.position.x) * pullToCenter * 0.3;
    comp.position.y += (featureCenterY - comp.position.y) * pullToCenter * 0.3;
  });
});
```

**Effect:**
- More natural, organic feel
- Important nodes naturally cluster in center
- Less rigid than pure Dagre

---

### Option H: Customizable Ranking Function

**Problem:** Want to control which nodes appear in which tier
**Solution:** Add custom ranking based on domain logic

```typescript
// Example: Rank by architectural layer
const getArchitecturalRank = (doc: Doc): number => {
  // Lower rank = higher in graph (top)
  if (doc.category === 'frontend') return 0;
  if (doc.category === 'api') return 1;
  if (doc.category === 'backend') return 2;
  if (doc.category === 'database') return 3;
  return 4; // Infrastructure, etc.
};

// Apply custom ranking
docs.forEach(doc => {
  g.setNode(doc.id, {
    width: 400,
    height: 200,
    rank: getArchitecturalRank(doc), // Force specific rank
  });
});
```

**Effect:**
- Frontend always at top, DB at bottom
- Matches mental model of architecture layers
- Very clear separation of concerns

---

### Option I: Interactive Layout Controls (UI Sliders)

**Problem:** Want to experiment with spacing in real-time
**Solution:** Add UI controls for live tuning

Add to your controls sidebar:

```typescript
<div className="space-y-2">
  <label className="text-xs">Node Spacing: {nodeSep}</label>
  <input
    type="range"
    min="50"
    max="200"
    value={nodeSep}
    onChange={(e) => {
      setNodeSep(Number(e.target.value));
      generateGraph(false); // Regenerate with new spacing
    }}
    className="range range-sm"
  />
</div>
```

**Effect:**
- Experiment with layouts in real-time
- Find optimal spacing for your data
- No code changes needed

---

### Option J: Smart Edge Routing (Orthogonal Edges)

**Problem:** Diagonal edges look messy, want clean 90° angles
**Solution:** Use React Flow's built-in edge types or custom routing

```typescript
// Use smoothstep with better curvature
edges.forEach(edge => {
  edge.type = 'smoothstep';
  edge.pathOptions = {
    offset: 30,          // Offset from center
    borderRadius: 20,    // Smooth corners
    curvature: 0.5,      // How curved (0 = straight, 1 = very curved)
  };
});

// Or use 'step' for pure orthogonal (Manhattan routing)
edge.type = 'step';
```

**Effect:**
- Professional flowchart look
- Easier to follow edges
- Less visual clutter

---

### Option K: Minimap Enhancement for Dagre

**Problem:** Dagre creates tall/wide graphs, hard to navigate
**Solution:** Enhanced minimap with better visualization

```typescript
<MiniMap
  nodeColor={(node) => {
    const strength = calculateConnectionStrength(node.data.component);
    // More connected = brighter
    return `hsl(210, 70%, ${30 + (strength / maxStrength) * 50}%)`;
  }}
  nodeStrokeWidth={3}
  nodeBorderRadius={2}
  maskColor="rgba(0, 0, 0, 0.7)"
  style={{
    height: 200,
    width: 250,
  }}
/>
```

**Effect:**
- See node importance at a glance
- Better overview of large graphs
- Easier navigation

---

### Option L: Multi-Root Layout

**Problem:** Graph has multiple disconnected components
**Solution:** Detect connected components, layout separately

```typescript
// Find connected components
const components = findConnectedComponents(docs);

let currentY = 0;
components.forEach(componentDocs => {
  const subgraph = generateDagreLayout(componentDocs, 'feature');

  // Offset each component vertically
  subgraph.forEach(node => {
    node.position.y += currentY;
  });

  currentY += calculateHeight(subgraph) + 300; // Gap between components

  newNodes.push(...subgraph);
});
```

**Effect:**
- Clean separation of isolated components
- No wasted space from disconnected nodes
- Clear visual distinction

---

## Visual Enhancement Options (Complement the Layout)

### 1. Relationship Strength Visualization

Make edge thickness proportional to weight:

```typescript
style: {
  strokeWidth: 1 + (getRelationshipWeight(rel.relationType) / 10) * 4, // 1-5px
}
```

### 2. Node Sizing by Importance

Important nodes bigger:

```typescript
const size = 150 + (calculateConnectionStrength(doc) / maxStrength) * 150;
g.setNode(doc.id, { width: size, height: size * 0.5 });
```

### 3. Animated Flow on Edges

Show dependency direction:

```typescript
animated: rel.relationType === 'depends_on' || rel.relationType === 'calls',
```

### 4. Gradient Edges for Long Connections

Cross-feature edges get gradient:

```typescript
style: {
  stroke: isCrossFeature ? 'url(#gradient)' : color,
}
```

### 5. Glow Effect on Hub Nodes

Highlight highly connected:

```typescript
style: {
  boxShadow: strength > threshold ? `0 0 20px ${color}` : 'none',
}
```

---

## Performance Optimizations for Large Graphs

### Virtual Rendering

Only render visible nodes:

```typescript
const visibleNodes = nodes.filter(node => {
  return isInViewport(node.position, viewport);
});
```

### Progressive Layout

Layout in chunks to prevent freeze:

```typescript
const layoutInChunks = async (docs: Doc[], chunkSize = 20) => {
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    await layoutChunk(chunk);
    await new Promise(resolve => setTimeout(resolve, 0)); // Let UI update
  }
};
```

### Cached Layouts

Don't recalculate if data hasn't changed:

```typescript
const layoutCacheKey = `${docs.length}-${docs.map(d => d.updatedAt).join(',')}`;
if (layoutCache[layoutCacheKey]) {
  return layoutCache[layoutCacheKey];
}
```

---

## Recommended Next Steps

### Phase 1: Tuning (Quick Wins)
1. **Adjust spacing** - Add sliders to find optimal nodesep/ranksep for your data
2. **Try LR mode** - See if left-to-right feels better for your use case
3. **Tweak relationship weights** - Adjust the weight values based on what looks good

### Phase 2: Visual Enhancement (Medium Effort)
1. **Compound nodes** - Add boxes around feature groups
2. **Edge thickness by weight** - Visual hierarchy for relationships
3. **Better minimap colors** - Show importance via color intensity

### Phase 3: Advanced Features (Higher Effort)
1. **Custom ranking** - Implement architectural layer ranking
2. **Edge bundling** - Reduce visual clutter with many relationships
3. **Hybrid force-directed** - Add organic clustering within features

### Phase 4: Performance (If Needed)
1. **Virtual rendering** - Only if you have 100+ nodes
2. **Layout caching** - Speed up repeated layouts
3. **Web worker** - Offload Dagre to background thread

---

## Comparison Matrix: Which Option Should You Choose?

| Option | Complexity | Visual Impact | Best For |
|--------|------------|---------------|----------|
| **A: Compact Layout** | Low | Medium | Large graphs, limited space |
| **B: LR Flow** | Low | High | Sequential dependencies, wide screens |
| **C: Radial** | Medium | High | Hub-and-spoke architectures |
| **D: Strict Layers** | Low | High | Clear hierarchies, org charts |
| **E: Edge Bundling** | High | Very High | Dense graphs, many relationships |
| **F: Compound Nodes** | Medium | Very High | Feature grouping, nested components |
| **G: Force Sub-Clustering** | High | Medium | Organic feel, exploratory |
| **H: Custom Ranking** | Medium | High | Domain-specific layouts |
| **I: UI Sliders** | Low | N/A | Experimentation, finding optimal config |
| **J: Orthogonal Edges** | Low | Medium | Clean flowchart aesthetic |
| **K: Enhanced Minimap** | Low | Medium | Large graphs, navigation |
| **L: Multi-Root** | Medium | Medium | Disconnected components |

---

## My Recommendations Based on Your Feedback

Since you said "it's better but not quite there" and don't know exactly what you want, I recommend:

### Immediate Quick Tests (5 min each)

1. **Add UI sliders** (Option I) - Let you experiment without code changes
2. **Try LR mode** (Option B) - See if horizontal flow feels better
3. **Adjust current spacing** - Reduce nodesep to 80, ranksep to 120 (more compact)

### Next Iteration (1-2 hours)

1. **Compound nodes** (Option F) - Boxes around features make grouping clearer
2. **Edge thickness by weight** - Visual hierarchy helps understand importance
3. **Custom ranking** (Option H) - Force architectural layers into specific tiers

### Polish (2-3 hours)

1. **Edge bundling** (Option E) - Major visual cleanup for complex graphs
2. **Enhanced minimap** (Option K) - Better navigation
3. **Node sizing by importance** - Hub nodes bigger = clearer structure

---

## Questions to Help You Decide

1. **Graph Density**: How many nodes typically? (< 20 = compact works, > 50 = need virtual rendering)
2. **Relationship Density**: Average relationships per node? (< 3 = current ok, > 5 = need bundling)
3. **Hierarchy Depth**: How many dependency levels? (2-3 = current ok, 5+ = need strict layering)
4. **Screen Size**: Primarily desktop or mobile? (Desktop = LR works, Mobile = TB better)
5. **Aesthetic Preference**: Clinical/professional or organic/exploratory? (Clinical = strict layers, Organic = force-directed)

Answer these and I can give you a specific implementation path!

---

## Code Examples Repository

I've implemented the core Dagre layout. To add any of the above options, the structure is:

```typescript
// All tuning happens in generateDagreLayout() function
const generateDagreLayout = (components, mode) => {
  const g = new dagre.graphlib.Graph();

  // MODIFY THIS SECTION FOR OPTIONS A-D
  g.setGraph({
    rankdir: mode === 'type' ? 'LR' : 'TB',
    nodesep: YOUR_VALUE,
    ranksep: YOUR_VALUE,
    ranker: 'network-simplex', // or 'tight-tree', 'longest-path'
  });

  // MODIFY NODE CREATION FOR OPTIONS C, H
  components.forEach(doc => {
    g.setNode(doc.id, {
      width: YOUR_WIDTH,
      height: YOUR_HEIGHT,
      rank: YOUR_CUSTOM_RANK, // Optional: force specific tier
    });
  });

  // EDGE CREATION ALREADY HAS WEIGHTING
  // Modify minlen or weight for fine-tuning

  dagre.layout(g);
  return extractedNodes;
};
```

The beauty is you can try options without major refactoring - just tune parameters!
