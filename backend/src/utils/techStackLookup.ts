import { STACK_CATEGORIES, TechOption, TechCategory } from '../../../shared/data/techStackData';

export interface TechLookupResult {
  found: boolean;
  name: string;
  category?: string;
  version?: string;
  description?: string;
  originalCategory?: string; // The category from techStackData (frontend category)
}

/**
 * Lookup a technology by name in the tech stack data
 * Returns the tech info if found, including suggested category and version
 */
export function lookupTech(name: string): TechLookupResult {
  const lowerName = name.toLowerCase();

  // Search through all categories for a matching tech
  for (const category of STACK_CATEGORIES) {
    // First try exact match
    let match = category.options.find(
      (option: TechOption) => option.name.toLowerCase() === lowerName
    );

    // If no exact match, try fuzzy matching (remove common suffixes)
    if (!match) {
      match = category.options.find((option: TechOption) => {
        const optionLower = option.name.toLowerCase();
        const inputWithoutSuffix = removeTechSuffix(lowerName);
        const optionWithoutSuffix = removeTechSuffix(optionLower);

        // Match if either the full names match after removing suffixes
        // or if the input matches the option without suffix
        return optionWithoutSuffix === inputWithoutSuffix ||
               optionWithoutSuffix === lowerName ||
               optionLower === inputWithoutSuffix;
      });
    }

    if (match) {
      // Map frontend category to backend category
      const backendCategory = mapToBackendCategory(category.id, 'tech');

      return {
        found: true,
        name: match.name, // Use the properly cased name from data
        category: backendCategory,
        version: match.latestVersion,
        description: match.description,
        originalCategory: category.id
      };
    }
  }

  return {
    found: false,
    name: name // Return the name as provided
  };
}

/**
 * Remove common tech suffixes for fuzzy matching
 */
function removeTechSuffix(name: string): string {
  const suffixes = ['.js', '.ts', ' js', ' css', '.css', '.io', ' ui', '-ui'];
  let result = name;

  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break; // Only remove one suffix
    }
  }

  return result;
}

/**
 * Map frontend category IDs to backend category strings
 */
function mapToBackendCategory(frontendCategory: string, type: 'tech' | 'package'): string {
  const categoryMap: { [key: string]: { tech: string, package: string } } = {
    'frontend-framework': { tech: 'framework', package: 'ui' },
    'meta-framework': { tech: 'framework', package: 'ui' },
    'ui-library': { tech: 'framework', package: 'ui' },
    'styling': { tech: 'styling', package: 'ui' },
    'backend-language': { tech: 'runtime', package: 'api' },
    'backend-framework': { tech: 'framework', package: 'api' },
    'database': { tech: 'database', package: 'data' },
    'database-orm': { tech: 'database', package: 'data' },
    'mobile-framework': { tech: 'framework', package: 'ui' },
    'desktop-framework': { tech: 'framework', package: 'ui' },
    'hosting-deployment': { tech: 'deployment', package: 'utility' },
    'development-tools': { tech: 'tooling', package: 'utility' },
    'testing': { tech: 'testing', package: 'utility' },
    'authentication': { tech: 'tooling', package: 'auth' },
    'payments': { tech: 'tooling', package: 'utility' },
    'email': { tech: 'tooling', package: 'api' },
    'file-storage': { tech: 'tooling', package: 'data' },
    'analytics': { tech: 'tooling', package: 'data' },
    'monitoring': { tech: 'tooling', package: 'utility' },
    'cms': { tech: 'tooling', package: 'data' },
    'state-management': { tech: 'tooling', package: 'state' },
    'data-fetching': { tech: 'tooling', package: 'api' },
    'forms': { tech: 'tooling', package: 'forms' },
    'routing': { tech: 'tooling', package: 'routing' },
    'animation': { tech: 'tooling', package: 'animation' },
    'utilities': { tech: 'tooling', package: 'utility' }
  };

  const mapping = categoryMap[frontendCategory] || { tech: 'tooling', package: 'utility' };
  return type === 'tech' ? mapping.tech : mapping.package;
}

/**
 * Get list of all valid backend tech categories
 */
export function getValidTechCategories(): string[] {
  return ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
}

/**
 * Get list of all valid backend package categories
 */
export function getValidPackageCategories(): string[] {
  return ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data'];
}
