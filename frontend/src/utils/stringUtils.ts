/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 */
export const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns The string with the first letter of each word capitalized
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Capitalizes the first letter of a string without lowercasing the rest
 * @param str - The string to capitalize
 * @returns The string with only the first letter capitalized
 */
export const capitalizeFirstOnly = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};
