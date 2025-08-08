export interface BaseNote {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseTodo {
  id: string;
  text: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseDevLogEntry {
  id: string;
  title?: string;
  description?: string;
  entry: string;
  date: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseDoc {
  id: string;
  type: 'Model' | 'Route' | 'API' | 'Util' | 'ENV' | 'Auth' | 'Runtime' | 'Framework';
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseLink {
  id: string;
  title: string;
  url: string;
  type: 'github' | 'demo' | 'docs' | 'other';
}

export interface BaseSelectedTechnology {
  category: 'styling' | 'database' | 'framework' | 'runtime' | 'deployment' | 'testing' | 'tooling';
  name: string;
  version: string;
}

export interface BaseSelectedPackage {
  category: 'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'utility' | 'api' | 'auth' | 'data';
  name: string;
  version: string;
  description: string;
}

export interface BaseProject {
  id: string;
  name: string;
  description: string;
  notes: BaseNote[];
  todos: BaseTodo[];
  devLog: BaseDevLogEntry[];
  docs: BaseDoc[];
  selectedTechnologies: BaseSelectedTechnology[];
  selectedPackages: BaseSelectedPackage[];
  stagingEnvironment: 'development' | 'staging' | 'production';
  links: BaseLink[];
  color: string;
  category: string;
  tags: string[];
  isArchived: boolean;
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
  deploymentData?: any;
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
  links: boolean;
  docs: boolean;
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
}

export interface UpdateTodoData {
  text?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface CreateDevLogData {
  title?: string;
  description?: string;
  entry: string;
}

export interface UpdateDevLogData {
  title?: string;
  description?: string;
  entry?: string;
}

export interface CreateDocData {
  type: 'Model' | 'Route' | 'API' | 'Util' | 'ENV' | 'Auth' | 'Runtime' | 'Framework';
  title: string;
  content: string;
}

export interface UpdateDocData {
  type?: 'Model' | 'Route' | 'API' | 'Util' | 'ENV' | 'Auth' | 'Runtime' | 'Framework';
  title?: string;
  content?: string;
}

export interface CreateLinkData {
  title: string;
  url: string;
  type?: 'github' | 'demo' | 'docs' | 'other';
}

export interface UpdateLinkData {
  title?: string;
  url?: string;
  type?: 'github' | 'demo' | 'docs' | 'other';
}

export interface CreateTechnologyData {
  category: 'styling' | 'database' | 'framework' | 'runtime' | 'deployment' | 'testing' | 'tooling';
  name: string;
  version?: string;
}

export interface CreatePackageData {
  category: 'ui' | 'state' | 'routing' | 'forms' | 'animation' | 'utility' | 'api' | 'auth' | 'data';
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
  selectedTechnologies?: BaseSelectedTechnology[];
  selectedPackages?: BaseSelectedPackage[];
}