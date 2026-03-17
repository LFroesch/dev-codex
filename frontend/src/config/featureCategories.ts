import { FeatureCategory } from '../../../shared/types/project';

export interface FeatureType {
  value: string;
  label: string;
  emoji: string;
  description: string;
}

export interface Category {
  value: FeatureCategory;
  label: string;
  color: string;
  emoji: string;
  description: string;
  types: FeatureType[];
}

export const FEATURE_CATEGORIES: Record<FeatureCategory, Category> = {
  frontend: {
    value: 'frontend',
    label: 'Frontend',
    color: '#a855f7', // Purple
    emoji: '🎨',
    description: 'Client-side UI components and logic',
    types: [
      { value: 'page', label: 'Page', emoji: '📄', description: 'Full page component' },
      { value: 'component', label: 'Component', emoji: '🧩', description: 'Reusable UI component' },
      { value: 'hook', label: 'Hook', emoji: '🪝', description: 'React hook' },
      { value: 'context', label: 'Context', emoji: '🌍', description: 'React context provider' },
      { value: 'layout', label: 'Layout', emoji: '📐', description: 'Layout wrapper component' },
      { value: 'util', label: 'Utility', emoji: '🔧', description: 'Frontend utility function' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom frontend element' }
    ]
  },
  backend: {
    value: 'backend',
    label: 'Backend',
    color: '#3b82f6', // Blue
    emoji: '⚙️',
    description: 'Server-side logic and APIs',
    types: [
      { value: 'service', label: 'Service', emoji: '🔄', description: 'Business logic service' },
      { value: 'route', label: 'Route/Endpoint', emoji: '🛣️', description: 'API route or endpoint' },
      { value: 'model', label: 'Model', emoji: '📊', description: 'Data model or schema' },
      { value: 'controller', label: 'Controller', emoji: '🎮', description: 'Request controller' },
      { value: 'middleware', label: 'Middleware', emoji: '🔗', description: 'Middleware function' },
      { value: 'util', label: 'Utility', emoji: '🔧', description: 'Backend utility function' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom backend element' }
    ]
  },
  database: {
    value: 'database',
    label: 'Database',
    color: '#f97316', // Orange
    emoji: '🗃️',
    description: 'Data models and database operations',
    types: [
      { value: 'schema', label: 'Schema', emoji: '📋', description: 'Database schema definition' },
      { value: 'migration', label: 'Migration', emoji: '🔄', description: 'Database migration script' },
      { value: 'seed', label: 'Seed Data', emoji: '🌱', description: 'Database seed data' },
      { value: 'query', label: 'Query', emoji: '🔍', description: 'Database query' },
      { value: 'index', label: 'Index', emoji: '📑', description: 'Database index definition' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom database element' }
    ]
  },
  infrastructure: {
    value: 'infrastructure',
    label: 'Infrastructure',
    color: '#eab308', // Yellow
    emoji: '🏗️',
    description: 'Deployment, CI/CD, and configuration',
    types: [
      { value: 'deployment', label: 'Deployment', emoji: '🚀', description: 'Deployment configuration' },
      { value: 'cicd', label: 'CI/CD', emoji: '🔁', description: 'CI/CD pipeline' },
      { value: 'env', label: 'Environment', emoji: '🌐', description: 'Environment configuration' },
      { value: 'config', label: 'Configuration', emoji: '⚙️', description: 'App configuration' },
      { value: 'monitoring', label: 'Monitoring', emoji: '📊', description: 'Monitoring setup' },
      { value: 'docker', label: 'Docker', emoji: '🐳', description: 'Docker configuration' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom infrastructure element' }
    ]
  },
  security: {
    value: 'security',
    label: 'Security',
    color: '#ef4444', // Red
    emoji: '🔐',
    description: 'Authentication, authorization, and security',
    types: [
      { value: 'auth', label: 'Authentication', emoji: '🔑', description: 'Authentication logic' },
      { value: 'authz', label: 'Authorization', emoji: '🛡️', description: 'Authorization rules' },
      { value: 'encryption', label: 'Encryption', emoji: '🔒', description: 'Encryption utilities' },
      { value: 'validation', label: 'Validation', emoji: '✅', description: 'Input validation' },
      { value: 'sanitization', label: 'Sanitization', emoji: '🧹', description: 'Data sanitization' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom security element' }
    ]
  },
  api: {
    value: 'api',
    label: 'API & Integration',
    color: '#06b6d4', // Cyan
    emoji: '🔌',
    description: 'External APIs and integrations',
    types: [
      { value: 'client', label: 'API Client', emoji: '📡', description: 'API client wrapper' },
      { value: 'integration', label: 'Integration', emoji: '🔗', description: 'Third-party integration' },
      { value: 'webhook', label: 'Webhook', emoji: '📨', description: 'Webhook handler' },
      { value: 'contract', label: 'Contract/Spec', emoji: '📝', description: 'API contract or specification' },
      { value: 'graphql', label: 'GraphQL', emoji: '🔷', description: 'GraphQL schema or resolver' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom API element' }
    ]
  },
  documentation: {
    value: 'documentation',
    label: 'Documentation',
    color: '#ec4899', // Pink
    emoji: '📚',
    description: 'Guides, docs, and architecture',
    types: [
      { value: 'area', label: 'Area Label', emoji: '📍', description: 'Large label to define a region or section in the graph' },
      { value: 'section', label: 'Section Header', emoji: '🏷️', description: 'Section header for organizing features' },
      { value: 'guide', label: 'Guide', emoji: '📖', description: 'How-to guide' },
      { value: 'architecture', label: 'Architecture', emoji: '🏛️', description: 'Architecture documentation' },
      { value: 'api-doc', label: 'API Documentation', emoji: '📃', description: 'API documentation' },
      { value: 'readme', label: 'README', emoji: '📄', description: 'README file' },
      { value: 'changelog', label: 'Changelog', emoji: '📝', description: 'Changelog or release notes' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom documentation' }
    ]
  },
  asset: {
    value: 'asset',
    label: 'Assets',
    color: '#22c55e', // Green
    emoji: '📦',
    description: 'Static assets and resources',
    types: [
      { value: 'image', label: 'Images', emoji: '🖼️', description: 'Image assets' },
      { value: 'font', label: 'Fonts', emoji: '🔤', description: 'Font files' },
      { value: 'video', label: 'Videos', emoji: '🎥', description: 'Video files' },
      { value: 'audio', label: 'Audio', emoji: '🔊', description: 'Audio files' },
      { value: 'document', label: 'Documents', emoji: '📋', description: 'Document files' },
      { value: 'dependency', label: 'Dependencies', emoji: '📦', description: 'External dependencies' },
      { value: 'custom', label: 'Custom', emoji: '✨', description: 'Custom asset type' }
    ]
  }
};

// Helper functions
export const getCategoryByValue = (value: FeatureCategory): Category => {
  return FEATURE_CATEGORIES[value];
};

export const getAllCategories = (): Category[] => {
  return Object.values(FEATURE_CATEGORIES);
};

export const getTypesForCategory = (category: FeatureCategory): FeatureType[] => {
  return FEATURE_CATEGORIES[category].types;
};

export const getCategoryColor = (category: FeatureCategory): string => {
  return FEATURE_CATEGORIES[category].color;
};
