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

## Next Steps

1. **Prototype** - Implement basic Dagre layout first (Phase 1)
2. **Validate** - Test with your current project data
3. **Iterate** - Add semantic weighting (Phase 2) based on results
4. **Polish** - Add feature clustering (Phase 3) if needed
5. **Document** - Update component documentation with layout algorithm details

**Estimated Effort:** 4-6 hours for full implementation with testing
**Complexity:** Medium (mostly swapping layout algorithm, existing graph logic is solid)
**Risk:** Low (can keep grid as fallback, positions still localStorage-overrideable)
