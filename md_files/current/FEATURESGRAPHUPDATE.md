# FeaturesGraph Enhancement Plan

## Current Setup (FeaturesGraph.tsx)
- Completely revamp to make way for the requested Features
- Remove "type" sort type, just have it be feature based

## Requested Features to Add
- I want to have these features, but I don't want random ai slop "CROSS OUR FINGERS" code, either libraries, tried and true verified methods
- or tell me that you DO NOT KNOW HOW TO DO IT. do NOT hallucinate code and waste tokens
**Example:** Each Feature is horizontally laid out, it should automatically make a documentation(section header) as the top node if one doesnt already exist for a feature, and then proceed to generate downward with customizable ranking function below, and edge bundling / detection, node sizing if it has more connections.
KEEP IT SIMPLE PLEASE SIMPLE & WORKING > COMPLEX AND BROKEN AND WASTED TOKENS

### 🎯 Node Sizing (Priority: HIGH - Quick Win)
**What:** Make nodes a little bigger the more connections they have
**Why:** Instantly shows important nodes in the graph

### 🅴 Edge Bundling / Detection
**What:** Group edges going in similar directions to reduce visual clutter, dont auto layout a node on top of an edge
**Why:** Makes dense graphs with many relationships easier to read

### 🅷 Customizable Ranking Function
**What:** Force nodes into specific tiers (height level on graph) based on category (documents + assets > infrastructure > frontend > api > backend > security > database)
**Why:** Clear architectural layer visualization

### 🅻 Multi-Root Layout
**What:** Detect different features as top level "roots" and extend them horizontally
**Why:** Clean separation of unrelated component clusters
