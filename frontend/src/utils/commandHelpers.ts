/**
 * Generate command template from syntax (same logic as autocomplete)
 * Example: "/set deployment --url=[url] --platform=[platform]" → "/set deployment --url= --platform="
 */
export const generateTemplate = (syntax: string): string => {
  // Remove @project from syntax if present
  syntax = syntax.replace(/@[\w-]+/g, '').trim();

  // Remove content inside [...] brackets (placeholder text)
  // Example: "/add subtask "[parent todo]" "[subtask text]"" → "/add subtask "" ""
  syntax = syntax.replace(/\[([^\]]*)\]/g, '');

  // Special handling for different command patterns
  if (syntax.includes('--')) {
    // Has flags - extract them and create template
    const parts = syntax.split('--');
    const baseCommand = parts[0].trim();

    // Extract flag names from patterns like --url=[url] or --role=[editor/viewer]
    const flags = parts.slice(1).map(part => {
      const flagMatch = part.match(/^(\w+)/);
      return flagMatch ? `--${flagMatch[1]}=` : '';
    }).filter(Boolean);

    return `${baseCommand} ${flags.join(' ')}`;
  }

  // No flags - return base command with space (or with empty quotes if present)
  const baseMatch = syntax.match(/^(\/[^\[]+)/);
  return baseMatch ? `${baseMatch[1].trim()} ` : `${syntax} `;
};
