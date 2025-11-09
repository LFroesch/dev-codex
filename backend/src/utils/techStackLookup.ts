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
      const backendCategory = mapToBackendCategory(category.id);

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
 * Map frontend category IDs to backend tech category strings
 */
function mapToBackendCategory(frontendCategory: string): string {
  const categoryMap: { [key: string]: string } = {
    'frontend-framework': 'framework',
    'meta-framework': 'framework',
    'ui-library': 'framework',
    'styling': 'styling',
    'backend-language': 'runtime',
    'backend-framework': 'framework',
    'database': 'database',
    'database-orm': 'database',
    'mobile-framework': 'framework',
    'desktop-framework': 'framework',
    'hosting-deployment': 'deployment',
    'development-tools': 'tooling',
    'testing': 'testing',
    'authentication': 'tooling',
    'payments': 'tooling',
    'email': 'tooling',
    'file-storage': 'tooling',
    'analytics': 'tooling',
    'monitoring': 'tooling',
    'cms': 'tooling',
    'state-management': 'tooling',
    'data-fetching': 'tooling',
    'forms': 'tooling',
    'routing': 'tooling',
    'animation': 'tooling',
    'utilities': 'tooling'
  };

  return categoryMap[frontendCategory] || 'tooling';
}

/**
 * Get list of all valid backend tech categories
 */
export function getValidTechCategories(): string[] {
  return ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
}
