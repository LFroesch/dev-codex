# Type System Expansion Proposal

## Overview

This document outlines a comprehensive expansion of the project management system's type definitions to support various project types beyond web development, including game development, DevOps/operations, data engineering, mobile development, and more.

**Current State:** The system is optimized for web application development.

**Goal:** Create an industry-standard, comprehensive type system that covers multiple software domains while maintaining simplicity and usability.

---

## 1. Relationship Types

### Current (6 types)
```typescript
type RelationshipType =
  | 'uses'
  | 'implements'
  | 'extends'
  | 'depends_on'
  | 'calls'
  | 'contains'
```

### Proposed Expansion (25+ types)

```typescript
type RelationshipType =
  // Code & Architecture Relationships (existing + new)
  | 'uses'              // Component uses another component
  | 'implements'        // Implements an interface/contract
  | 'extends'           // Extends/inherits from
  | 'depends_on'        // Has a dependency on
  | 'calls'             // Makes function/API calls to
  | 'contains'          // Contains as a child/nested component
  | 'inherits_from'     // Class inheritance
  | 'composes'          // Composition relationship

  // Data Relationships
  | 'reads_from'        // Reads data from
  | 'writes_to'         // Writes data to
  | 'transforms'        // Transforms data from one form to another
  | 'validates'         // Validates data/input
  | 'serializes'        // Serializes/deserializes

  // Service & Communication Relationships
  | 'subscribes_to'     // Event/message subscription
  | 'publishes_to'      // Publishes events/messages
  | 'triggers'          // Triggers an action/event
  | 'consumes'          // Consumes a service/API
  | 'provides'          // Provides a service/API

  // Build, Deploy & Testing Relationships
  | 'builds'            // Build relationship
  | 'deploys'           // Deployment relationship
  | 'tests'             // Testing relationship
  | 'monitors'          // Monitoring relationship

  // Documentation & Reference
  | 'documents'         // Documentation for
  | 'references'        // References/mentions
  | 'similar_to'        // Similar implementation/pattern

  // Game Development Specific
  | 'spawns'            // Spawns entities/objects
  | 'controls'          // Controls another component
  | 'renders'           // Renders graphics/visuals
  | 'collides_with'     // Physics collision
  | 'animates'          // Animation relationship

  // Network & Distributed Systems
  | 'replicates'        // Network replication
  | 'synchronizes'      // State synchronization
```

### Use Cases by Domain

#### Web Development
- `uses`, `implements`, `extends`, `depends_on`, `calls`, `reads_from`, `writes_to`

#### Game Development
- `spawns`, `controls`, `renders`, `collides_with`, `animates`, `synchronizes`, `replicates`

#### DevOps/Infrastructure
- `builds`, `deploys`, `monitors`, `triggers`, `provides`, `consumes`

#### Data Engineering
- `reads_from`, `writes_to`, `transforms`, `validates`, `serializes`, `publishes_to`, `subscribes_to`

---

## 2. Component Categories

### Current (8 categories)
```typescript
type ComponentCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'infrastructure'
  | 'security'
  | 'api'
  | 'documentation'
  | 'asset'
```

### Proposed Expansion (20+ categories)

```typescript
type ComponentCategory =
  // Web/Application Development (existing)
  | 'frontend'           // Frontend components
  | 'backend'            // Backend services
  | 'database'           // Database schemas/queries
  | 'api'                // API endpoints/clients
  | 'infrastructure'     // Infrastructure code
  | 'security'           // Security implementations

  // Content & Configuration (existing + refined)
  | 'documentation'      // Documentation
  | 'asset'              // Assets (images, fonts, etc.)
  | 'configuration'      // Config files and settings

  // Game Development
  | 'gameplay'           // Gameplay mechanics
  | 'graphics'           // Graphics/rendering
  | 'audio'              // Audio systems
  | 'physics'            // Physics systems
  | 'ai'                 // AI/behavior systems
  | 'ui_game'            // Game UI (HUD, menus)
  | 'networking_game'    // Game networking

  // DevOps & Operations
  | 'cicd'               // CI/CD pipelines
  | 'monitoring'         // Monitoring/observability
  | 'logging'            // Logging systems
  | 'deployment'         // Deployment configs
  | 'orchestration'      // Container orchestration

  // Data & Analytics
  | 'data_pipeline'      // Data pipelines
  | 'analytics'          // Analytics/BI
  | 'ml_model'           // ML models
  | 'etl'                // ETL processes

  // Mobile Development
  | 'mobile_native'      // Native mobile code
  | 'mobile_cross_platform' // Cross-platform mobile

  // Testing
  | 'testing'            // Test suites
  | 'test_automation'    // Test automation
```

---

## 3. Component Types by Category

This section defines specific component types available for each category.

### Frontend
```
page, component, hook, context, layout, util, service, store, custom
```

### Backend
```
service, route, controller, model, middleware, util, worker, job, custom
```

### Database
```
schema, migration, seed, query, index, trigger, procedure, view, custom
```

### API
```
endpoint, client, integration, webhook, contract, graphql, rest, grpc, custom
```

### Infrastructure
```
terraform, cloudformation, ansible, docker, kubernetes, network, storage, custom
```

### Security
```
auth, authz, encryption, validation, sanitization, firewall, policy, custom
```

### Documentation
```
readme, guide, api_doc, architecture, tutorial, reference, changelog, custom
```

### Asset
```
image, font, video, audio, document, icon, sprite, texture, custom
```

### Configuration
```
env, settings, feature_flag, secrets, credentials, custom
```

### Gameplay (Game Dev)
```
mechanic, system, controller, manager, state_machine, ability, skill, inventory, custom
```

### Graphics (Game Dev)
```
shader, material, mesh, particle_system, animation, renderer, post_process, vfx, custom
```

### Audio (Game Dev)
```
sound_effect, music, mixer, spatial_audio, ambience, voice, custom
```

### Physics (Game Dev)
```
collider, rigid_body, constraint, raycast, trigger, joint, cloth, custom
```

### AI (Game Dev)
```
behavior_tree, nav_mesh, pathfinding, decision_system, perception, fsm, custom
```

### UI_Game (Game Dev)
```
hud, menu, dialog, inventory_ui, minimap, tooltip, notification, custom
```

### Networking_Game (Game Dev)
```
replication, rpc, lobby, matchmaking, session, sync, netcode, custom
```

### CICD (DevOps)
```
pipeline, workflow, action, job, stage, build, test, deploy, custom
```

### Monitoring (DevOps)
```
metric, alert, dashboard, trace, apm, healthcheck, slo, custom
```

### Logging (DevOps)
```
logger, aggregator, parser, shipper, filter, index, custom
```

### Deployment (DevOps)
```
container, image, chart, manifest, helm, kustomize, custom
```

### Orchestration (DevOps)
```
cluster, pod, service, ingress, configmap, secret, deployment, statefulset, custom
```

### Data_Pipeline (Data)
```
extractor, transformer, loader, scheduler, orchestrator, validator, custom
```

### Analytics (Data)
```
report, dashboard, query, visualization, metric, dimension, kpi, custom
```

### ML_Model (Data/ML)
```
model, feature, training_pipeline, inference, preprocessor, evaluator, custom
```

### ETL (Data)
```
source, sink, transformation, validation, enrichment, cleansing, custom
```

### Mobile_Native
```
screen, view, service, manager, util, bridge, module, custom
```

### Mobile_Cross_Platform
```
screen, component, service, plugin, bridge, module, custom
```

### Testing
```
unit_test, integration_test, e2e_test, performance_test, fixture, mock, custom
```

### Test_Automation
```
test_suite, test_runner, reporter, automation_script, custom
```

---

## 4. Stack Categories

### Current (16 categories)
```typescript
category:
  | 'framework' | 'runtime' | 'database' | 'styling' | 'deployment'
  | 'testing' | 'tooling' | 'ui' | 'state' | 'routing'
  | 'forms' | 'animation' | 'api' | 'auth' | 'data' | 'utility'
```

### Proposed Expansion (35+ categories)

```typescript
category:
  // Web/General Development (existing)
  | 'framework'          // React, Vue, Angular, Express
  | 'runtime'            // Node.js, Deno, Bun
  | 'database'           // PostgreSQL, MongoDB, Redis
  | 'styling'            // Tailwind, Sass, CSS-in-JS
  | 'deployment'         // Vercel, Netlify, Heroku
  | 'testing'            // Jest, Vitest, Playwright
  | 'tooling'            // Webpack, Vite, ESBuild
  | 'ui'                 // UI component libraries
  | 'state'              // Redux, Zustand, Jotai
  | 'routing'            // React Router, Next.js routing
  | 'forms'              // React Hook Form, Formik
  | 'animation'          // Framer Motion, GSAP
  | 'api'                // Axios, tRPC, GraphQL
  | 'auth'               // Auth0, Clerk, NextAuth
  | 'data'               // Tanstack Query, SWR
  | 'utility'            // Lodash, date-fns

  // Game Development
  | 'engine'             // Unity, Unreal, Godot
  | 'rendering'          // Three.js, Babylon.js
  | 'physics_engine'     // Box2D, PhysX, Rapier
  | 'audio_engine'       // FMOD, Wwise, Howler
  | 'asset_tools'        // Blender, Aseprite, Substance
  | 'game_networking'    // Photon, Mirror, Netcode

  // DevOps/Infrastructure
  | 'containerization'   // Docker, Podman
  | 'orchestration'      // Kubernetes, Docker Swarm
  | 'ci_cd'              // GitHub Actions, Jenkins, GitLab CI
  | 'monitoring'         // Prometheus, Grafana, Datadog
  | 'logging'            // ELK Stack, Loki, Splunk
  | 'iac'                // Terraform, Pulumi, CloudFormation
  | 'cloud_platform'     // AWS, GCP, Azure

  // Data & Machine Learning
  | 'data_processing'    // Apache Spark, Pandas, Polars
  | 'ml_framework'       // TensorFlow, PyTorch, scikit-learn
  | 'data_warehouse'     // Snowflake, BigQuery, Redshift
  | 'streaming'          // Kafka, RabbitMQ, Pulsar
  | 'visualization'      // D3.js, Chart.js, Plotly

  // Mobile Development
  | 'mobile_framework'   // React Native, Flutter, Ionic
  | 'mobile_ui'          // NativeBase, Tamagui
  | 'mobile_backend'     // Firebase, Supabase, Amplify

  // Security
  | 'security_tool'      // Snyk, SonarQube, OWASP ZAP

  // Development Tools
  | 'version_control'    // Git, SVN
  | 'package_manager'    // npm, yarn, pnpm
  | 'linter'             // ESLint, Prettier, Stylelint
  | 'bundler'            // Webpack, Rollup, Parcel
```

---

## 5. Implementation Strategy

### Phase 1: Minimal Viable Expansion (Recommended for MVP)
Add only the most critical types to support broader use cases:

**Relationship Types:** Add 2-3 essential ones
- `similar_to`, `references`, `provides`

**Component Categories:** Add 2-3 essential ones
- `testing`, `configuration`, `cicd`

**Stack Categories:** Add 4-6 essential ones
- `cloud_platform`, `monitoring`, `ci_cd`, `containerization`, `iac`, `ml_framework`

### Phase 2: Domain-Specific Expansion
Add full support for one domain at a time:
1. DevOps/Infrastructure (CICD, monitoring, logging, orchestration)
2. Data Engineering (data_pipeline, analytics, ETL, ml_model)
3. Game Development (gameplay, graphics, audio, physics, ai)
4. Mobile Development (mobile_native, mobile_cross_platform)

### Phase 3: Complete Expansion
Implement all proposed types and categories.

---

## 6. Benefits

### For Users
- ✅ Support any project type (web, mobile, game, data, ops)
- ✅ Better documentation and component relationships
- ✅ Industry-standard terminology
- ✅ Easier onboarding for different domains

### For the System
- ✅ Future-proof type system
- ✅ Minimal breaking changes (additive only)
- ✅ Better data organization
- ✅ More powerful search and filtering

---

## 7. Migration & Backward Compatibility

All changes are **additive only** - no existing types are removed or renamed.

**Existing data:** Fully compatible, no migration needed.

**New projects:** Can use expanded type system immediately.

**Validation:** Update validators to accept new enum values while maintaining old ones.

---

## 8. Recommendations

### For MVP/Current Stage:
Start with **Phase 1** - add only 8-10 new types total across all three areas. This gives immediate value without overwhelming users.

### Suggested Phase 1 Additions:

**Relationship Types (+3):**
- `similar_to`, `references`, `provides`

**Component Categories (+3):**
- `testing`, `configuration`, `cicd`

**Stack Categories (+6):**
- `cloud_platform`, `monitoring`, `ci_cd`, `containerization`, `iac`, `security_tool`

This gives enough flexibility for DevOps and testing use cases (the most common non-web scenarios) without adding complexity.

---

## 9. Examples

### Example 1: DevOps Project
```typescript
// Components
{
  category: 'cicd',
  type: 'pipeline',
  title: 'Production Deployment Pipeline',
  feature: 'Deployment Automation'
}

{
  category: 'monitoring',
  type: 'dashboard',
  title: 'Application Metrics Dashboard',
  feature: 'Observability'
}

// Stack
{ category: 'ci_cd', name: 'GitHub Actions' }
{ category: 'containerization', name: 'Docker' }
{ category: 'cloud_platform', name: 'AWS' }
{ category: 'monitoring', name: 'Grafana' }
```

### Example 2: Game Development Project
```typescript
// Components
{
  category: 'gameplay',
  type: 'mechanic',
  title: 'Player Movement System',
  feature: 'Core Gameplay'
}

{
  category: 'graphics',
  type: 'shader',
  title: 'Water Shader',
  feature: 'Environment'
}

// Relationships
{
  source: 'Player Controller',
  target: 'Movement System',
  relationType: 'uses'
}

{
  source: 'Enemy AI',
  target: 'Navigation Mesh',
  relationType: 'depends_on'
}

// Stack
{ category: 'engine', name: 'Unity', version: '2023.1' }
{ category: 'physics_engine', name: 'PhysX' }
{ category: 'audio_engine', name: 'FMOD' }
```

### Example 3: Data Engineering Project
```typescript
// Components
{
  category: 'data_pipeline',
  type: 'extractor',
  title: 'Customer Data Extractor',
  feature: 'ETL Pipeline'
}

{
  category: 'ml_model',
  type: 'model',
  title: 'Churn Prediction Model',
  feature: 'ML Models'
}

// Relationships
{
  source: 'Data Transformer',
  target: 'Data Validator',
  relationType: 'depends_on'
}

{
  source: 'ML Pipeline',
  target: 'Feature Store',
  relationType: 'reads_from'
}

// Stack
{ category: 'data_processing', name: 'Apache Spark' }
{ category: 'ml_framework', name: 'TensorFlow' }
{ category: 'data_warehouse', name: 'Snowflake' }
```

---

## Decision Points

**Questions to answer before implementation:**

1. Should we implement Phase 1 (minimal) or Phase 2 (domain-specific)?
2. Which domain is most important to support first? (DevOps, Data, Game, Mobile)
3. Should component types be strictly validated or allow "custom" for flexibility?
4. Do we want to migrate any existing data to use new types?
5. Should the UI show all types or filter by project category?

**Recommendation:** Start with Phase 1, gather user feedback, then expand based on actual usage patterns.
