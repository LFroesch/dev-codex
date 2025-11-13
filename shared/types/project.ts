export interface BaseNote {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | { _id: string; firstName: string; lastName: string };
  updatedBy?: string | { _id: string; firstName: string; lastName: string };
}

export interface BaseTodo {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  dueDate?: string;
  reminderDate?: string;
  assignedTo?: string | { _id: string; firstName: string; lastName: string; email: string }; // userId or populated user object
  parentTodoId?: string; // for subtasks
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseDevLogEntry {
  id: string;
  title?: string;
  description?: string;
  date: string;
  createdBy?: string | { _id: string; firstName: string; lastName: string };
  updatedBy?: string | { _id: string; firstName: string; lastName: string };
}

export type ComponentCategory = 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security' | 'api' | 'documentation' | 'asset';

export type RelationshipType = 'uses' | 'depends_on';

export interface ComponentRelationship {
  id: string;
  targetId: string;
  relationType: RelationshipType;
  description?: string;
}

export interface BaseComponent {
  id: string;
  category: ComponentCategory;
  type: string; // Flexible type based on category (e.g., 'service', 'route', 'page', 'component')
  title: string;
  content: string;
  feature: string; // Feature name is required - components belong to features
  filePath?: string; // Optional: link to actual codebase files
  tags?: string[]; // Additional flexible tagging
  relationships?: ComponentRelationship[]; // Manual relationships between components
  metadata?: Record<string, any>; // Template-populated or custom metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}


// Unified stack item type
export interface BaseStackItem {
  category: 'framework' | 'runtime' | 'database' | 'styling' | 'deployment' | 'testing' | 'tooling' |
            'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'api' | 'auth' | 'data' | 'utility';
  name: string;
  version: string;
  description: string;
}

export interface BaseProject {
  id: string;
  _id?: string; // MongoDB compatibility - same as id
  name: string;
  description: string;
  notes: BaseNote[];
  todos: BaseTodo[];
  devLog: BaseDevLogEntry[];
  components: BaseComponent[]; // Renamed from docs to components
  stack: BaseStackItem[]; // Unified tech stack
  stagingEnvironment: 'development' | 'staging' | 'production';
  color: string;
  category: string;
  tags: string[];
  isArchived: boolean;
  isLocked: boolean;
  lockedReason?: string;
  isShared: boolean;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  createdAt: string;
  updatedAt: string;

  // Team-related fields
  isOwner?: boolean;
  userRole?: 'owner' | 'editor' | 'viewer';
  canEdit?: boolean;
  canManageTeam?: boolean;

  // Additional features
  roadmapItems?: any[];
  deploymentData?: {
    liveUrl: string;
    githubRepo: string;
    deploymentPlatform: string;
    deploymentStatus: 'active' | 'inactive' | 'error';
    buildCommand: string;
    startCommand: string;
    lastDeployDate?: string;
    deploymentBranch: string;
    environmentVariables: Array<{
      key: string;
      value: string;
    }>;
    notes: string;
  };
  publicPageData?: any;
}

export interface ProjectTeamData {
  isOwner?: boolean;
  userRole?: 'owner' | 'editor' | 'viewer';
  canEdit?: boolean;
  canManageTeam?: boolean;
}

export interface ProjectVisibility {
  description: boolean;
  tags: boolean;
  components: boolean; // Renamed from docs
  techStack: boolean;
  timestamps: boolean;
}

// CRUD interfaces for API operations
export interface CreateNoteData {
  title: string;
  description?: string;
  content: string;
}

export interface UpdateNoteData {
  title?: string;
  description?: string;
  content?: string;
}

export interface CreateTodoData {
  text: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  dueDate?: string;
  reminderDate?: string;
  assignedTo?: string;
  parentTodoId?: string;
  tags?: string[];
}

export interface UpdateTodoData {
  text?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  status?: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  dueDate?: string;
  reminderDate?: string;
  assignedTo?: string;
  parentTodoId?: string;
  tags?: string[];
}

export interface CreateDevLogData {
  title?: string;
  description?: string;
}

export interface UpdateDevLogData {
  title?: string;
  description?: string;
}

export interface CreateComponentData {
  category: ComponentCategory;
  type: string;
  title: string;
  content: string;
  feature: string; // Feature is required when creating components
  filePath?: string;
  tags?: string[];
  relationships?: ComponentRelationship[];
  metadata?: Record<string, any>;
}

export interface UpdateComponentData {
  category?: ComponentCategory;
  type?: string;
  title?: string;
  content?: string;
  feature?: string;
  filePath?: string;
  tags?: string[];
  relationships?: ComponentRelationship[];
  metadata?: Record<string, any>;
}

export interface CreateRelationshipData {
  targetId: string;
  relationType: RelationshipType;
  description?: string;
}


// Unified stack item creation
export interface CreateStackItemData {
  category: 'framework' | 'runtime' | 'database' | 'styling' | 'deployment' | 'testing' | 'tooling' |
            'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'api' | 'auth' | 'data' | 'utility';
  name: string;
  version?: string;
  description?: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  stagingEnvironment?: 'development' | 'staging' | 'production';
  color?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  stagingEnvironment?: 'development' | 'staging' | 'production';
  color?: string;
  category?: string;
  tags?: string[];
  stack?: BaseStackItem[]; // Unified stack
  deploymentData?: {
    liveUrl?: string;
    githubRepo?: string;
    deploymentPlatform?: string;
    deploymentStatus?: 'active' | 'inactive' | 'error';
    buildCommand?: string;
    startCommand?: string;
    lastDeployDate?: string;
    deploymentBranch?: string;
    environmentVariables?: Array<{
      key: string;
      value: string;
    }>;
    notes?: string;
  };
}