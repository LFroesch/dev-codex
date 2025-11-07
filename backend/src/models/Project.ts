import mongoose, { Document, Schema } from 'mongoose';

// Sub-schemas for complex nested data
const todoSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 2000 },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'blocked', 'completed'],
    default: 'not_started'
  },
  dueDate: { type: Date },
  reminderDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentTodoId: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const devLogSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, default: '', maxlength: 200 },
  description: { type: String, default: '', maxlength: 10000 },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// NEW: Individual note schema
const noteSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 1000 },
  content: { type: String, required: true, maxlength: 50000 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const relationshipSchema = new Schema({
  id: { type: String, required: true },
  targetId: { type: String, required: true },
  relationType: {
    type: String,
    enum: ['uses', 'depends_on'],
    required: true
  },
  description: { type: String, default: '' }
});

const componentSchema = new Schema({
  id: { type: String, required: true },
  category: {
    type: String,
    enum: ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'],
    required: true
  },
  type: { type: String, required: true, maxlength: 100 }, // Flexible type based on category
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 50000 },
  feature: { type: String, required: true, maxlength: 100 }, // Feature is required - components belong to features
  filePath: { type: String, default: '', maxlength: 500 },
  tags: [{ type: String, maxlength: 50 }],
  relationships: [relationshipSchema],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});


// Unified stack item schema
const stackItemSchema = new Schema({
  category: {
    type: String,
    required: true,
    enum: [
      // Core technologies
      'framework', 'runtime', 'database', 'styling', 'deployment', 'testing', 'tooling',
      // Frontend/UI specific
      'ui', 'state', 'routing', 'forms', 'animation',
      // Backend/API specific
      'api', 'auth',
      // Data/utility
      'data', 'utility'
    ]
  },
  name: { type: String, required: true },
  version: { type: String, default: '' },
  description: { type: String, default: '' }
});

// Deployment data schema
const deploymentSchema = new Schema({
  liveUrl: { type: String, default: '' },
  githubRepo: { type: String, default: '' },
  deploymentPlatform: { type: String, default: '' },
  deploymentStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'error'],
    default: 'inactive'
  },
  buildCommand: { type: String, default: '' },
  startCommand: { type: String, default: '' },
  lastDeployDate: { type: Date },
  deploymentBranch: { type: String, default: 'main' },
  environmentVariables: [{
    key: { type: String, required: false, default: '' },
    value: { type: String, required: false, default: '' }
  }],
  notes: { type: String, default: '' }
});

export interface IProject extends Document {
  // Basic fields
  name: string;
  description: string;
  userId: mongoose.Types.ObjectId; // Legacy field, now acts as ownerId
  ownerId: mongoose.Types.ObjectId; // New owner field for clarity
  isArchived: boolean;
  isLocked: boolean;
  lockedReason?: string;
  isShared: boolean;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  publicVisibility?: {
    description: boolean;
    tags: boolean;
    components: boolean;
    techStack: boolean;
    timestamps: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Notes Section - UPDATED: Now an array of individual notes
  notes: Array<{
    id: string;
    title: string;
    description: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  todos: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
    dueDate?: Date;
    reminderDate?: Date;
    assignedTo?: mongoose.Types.ObjectId;
    parentTodoId?: string;
    createdAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
  }>;
  devLog: Array<{
    id: string;
    title: string;
    description: string;
    date: Date;
  }>;
  
  // Documentation Templates
  components: Array<{
    id: string;
    category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security' | 'api' | 'documentation' | 'asset';
    type: string; // Flexible type based on category
    title: string;
    content: string;
    feature: string; // Feature is required
    filePath?: string;
    tags?: string[];
    relationships?: Array<{
      id: string;
      targetId: string;
      relationType: 'uses' | 'depends_on';
      description?: string;
    }>;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  
  // Unified Tech Stack
  stack: Array<{
    category: 'framework' | 'runtime' | 'database' | 'styling' | 'deployment' | 'testing' | 'tooling' |
              'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'api' | 'auth' | 'data' | 'utility';
    name: string;
    version: string;
    description: string;
  }>;
  
  // Settings Section
  stagingEnvironment: 'development' | 'staging' | 'production';
  color: string;
  category: string;
  tags: string[];
  
  // Deployment Section
  deploymentData: {
    liveUrl: string;
    githubRepo: string;
    deploymentPlatform: string;
    deploymentStatus: 'active' | 'inactive' | 'error';
    buildCommand: string;
    startCommand: string;
    lastDeployDate?: Date;
    deploymentBranch: string;
    environmentVariables: Array<{
      key: string;
      value: string;
    }>;
    notes: string;
  };
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Notes Section - UPDATED: Now an array of individual notes
  notes: [noteSchema],
  todos: [todoSchema],
  devLog: [devLogSchema],

  // Feature Components
  components: [componentSchema],

  // Unified Tech Stack
  stack: [stackItemSchema],

  // Settings Section
  stagingEnvironment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Existing fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // New team-related fields
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedReason: {
    type: String,
    required: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  publicSlug: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  publicDescription: {
    type: String,
    required: false,
    maxlength: 300
  },
  publicVisibility: {
    description: { type: Boolean, default: true },
    tags: { type: Boolean, default: true },
    components: { type: Boolean, default: true },
    techStack: { type: Boolean, default: true },
    timestamps: { type: Boolean, default: true }
  },
  
  // Deployment Section
  deploymentData: {
    liveUrl: { type: String, default: '' },
    githubRepo: { type: String, default: '' },
    deploymentPlatform: { type: String, default: '' },
    deploymentStatus: { 
      type: String, 
      enum: ['active', 'inactive', 'error'],
      default: 'inactive'
    },
    buildCommand: { type: String, default: '' },
    startCommand: { type: String, default: '' },
    lastDeployDate: { type: Date },
    deploymentBranch: { type: String, default: 'main' },
    environmentVariables: [{
      key: { type: String, default: '' },
      value: { type: String, default: '' }
    }],
    notes: { type: String, default: '' }
  },
}, {
  timestamps: true
});

// Essential indexes for project queries
projectSchema.index({ userId: 1, isArchived: 1 });
projectSchema.index({ ownerId: 1, isArchived: 1 });
projectSchema.index({ isPublic: 1, isArchived: 1 });
projectSchema.index({ 'todos.assignedTo': 1 });
projectSchema.index({ 'todos.status': 1 });
projectSchema.index({ 'todos.dueDate': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ stagingEnvironment: 1 });

// Nested document indexes for efficient queries
projectSchema.index({ 'notes.id': 1 });
projectSchema.index({ 'components.id': 1 });
projectSchema.index({ 'components.category': 1 }); // Index for category filtering
projectSchema.index({ 'components.type': 1 }); // Index for type filtering
projectSchema.index({ 'components.feature': 1 }); // Index for feature grouping
projectSchema.index({ 'components.tags': 1 }); // Index for tag filtering

// Compound indexes for common filter patterns
projectSchema.index({ userId: 1, category: 1, isArchived: 1 });
projectSchema.index({ ownerId: 1, tags: 1, isArchived: 1 });
projectSchema.index({ isShared: 1, isArchived: 1 });

// Text index for search functionality
projectSchema.index({
  name: 'text',
  description: 'text',
  'notes.title': 'text',
  'notes.content': 'text',
  'components.title': 'text',
  'components.content': 'text',
  'components.feature': 'text',
  'components.tags': 'text',
  'todos.title': 'text',
  'todos.description': 'text',
  'devLog.title': 'text',
  'devLog.description': 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    'notes.title': 3,
    'notes.content': 1,
    'components.title': 3,
    'components.content': 1,
    'components.feature': 4, // Feature names are important for search
    'components.tags': 2, // Tags are moderately important
    'todos.title': 2,
    'todos.description': 1,
    'devLog.title': 2,
    'devLog.description': 1
  }
});

// Additional indexes for terminal command performance
projectSchema.index({ 'todos.id': 1 });
projectSchema.index({ 'devLog.id': 1 });
projectSchema.index({ 'todos.completed': 1, 'todos.priority': 1 });
projectSchema.index({ ownerId: 1, updatedAt: -1 }); // For recent projects cache
projectSchema.index({ userId: 1, updatedAt: -1 }); // For recent projects cache

// Compound indexes for team queries (used in command handlers)
projectSchema.index({ ownerId: 1, 'members.userId': 1 });

// Cache invalidation middleware
projectSchema.post('save', async function(doc) {
  // Invalidate cache for project owner
  const { projectCache } = await import('../services/ProjectCache');
  projectCache.invalidate(doc.userId.toString());
  if (doc.ownerId && doc.ownerId.toString() !== doc.userId.toString()) {
    projectCache.invalidate(doc.ownerId.toString());
  }
});

projectSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    const { projectCache } = await import('../services/ProjectCache');
    projectCache.invalidate(doc.userId.toString());
    if (doc.ownerId && doc.ownerId.toString() !== doc.userId.toString()) {
      projectCache.invalidate(doc.ownerId.toString());
    }
  }
});

projectSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const { projectCache } = await import('../services/ProjectCache');
    projectCache.invalidate(doc.userId.toString());
    if (doc.ownerId && doc.ownerId.toString() !== doc.userId.toString()) {
      projectCache.invalidate(doc.ownerId.toString());
    }
  }
});

export const Project = mongoose.model<IProject>('Project', projectSchema);