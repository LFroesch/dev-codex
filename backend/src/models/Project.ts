import mongoose, { Document, Schema } from 'mongoose';

// Sub-schemas for complex nested data
const todoSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  description: { type: String, default: '' },
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
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  entry: { type: String, required: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// NEW: Individual note schema
const noteSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const docSchema = new Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'],
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});


// Tech stack selection schemas
const selectedTechSchema = new Schema({
  category: { 
    type: String, 
    required: true,
    enum: ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling']
  },
  name: { type: String, required: true },
  version: { type: String, default: '' }
});

const selectedPackageSchema = new Schema({
  category: { 
    type: String, 
    required: true,
    enum: ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data']
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
  isShared: boolean;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  publicVisibility?: {
    description: boolean;
    tags: boolean;
    docs: boolean;
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
    text: string;
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
    entry: string;
    date: Date;
  }>;
  
  // Documentation Templates
  docs: Array<{
    id: string;
    type: 'Model' | 'Route' | 'API' | 'Util' | 'ENV' | 'Auth' | 'Runtime' | 'Framework';
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  
  // Tech Stack & Packages
  selectedTechnologies: Array<{
    category: 'styling' | 'database' | 'framework' | 'runtime' | 'deployment' | 'testing' | 'tooling';
    name: string;
    version: string;
  }>;
  selectedPackages: Array<{
    category: 'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'utility' | 'api' | 'auth' | 'data';
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
  
  // Documentation Templates
  docs: [docSchema],
  
  // Tech Stack & Packages
  selectedTechnologies: [selectedTechSchema],
  selectedPackages: [selectedPackageSchema],
  
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
    docs: { type: Boolean, default: true },
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
projectSchema.index({ 'docs.id': 1 });
projectSchema.index({ 'docs.type': 1 });

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
  'docs.title': 'text',
  'docs.content': 'text',
  'todos.text': 'text',
  'todos.description': 'text',
  'devLog.title': 'text',
  'devLog.entry': 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    'notes.title': 3,
    'notes.content': 1,
    'docs.title': 3,
    'docs.content': 1,
    'todos.text': 2,
    'todos.description': 1,
    'devLog.title': 2,
    'devLog.entry': 1
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