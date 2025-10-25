/**
 * Utility functions for calculating text metrics (character count, token estimation)
 */

export interface TextMetrics {
  characterCount: number;
  estimatedTokens: number;
}

/**
 * Calculate character count and estimate token count for a given text
 * Token estimation is based on a rough average of ~4 characters per token
 * This is a simplified approximation; actual token counts may vary
 *
 * @param text - The text to analyze
 * @returns TextMetrics object with character count and estimated tokens
 */
export function calculateTextMetrics(text: string): TextMetrics {
  const characterCount = text.length;

  // Token estimation using a simple heuristic:
  // Average ~4 characters per token for English text
  // This is based on OpenAI's GPT tokenization patterns
  const estimatedTokens = Math.ceil(characterCount / 4);

  return {
    characterCount,
    estimatedTokens
  };
}

/**
 * Format text metrics into a human-readable string
 *
 * @param metrics - TextMetrics object
 * @returns Formatted string like "1,234 chars (~308 tokens)"
 */
export function formatTextMetrics(metrics: TextMetrics): string {
  const formattedChars = metrics.characterCount.toLocaleString();
  const formattedTokens = metrics.estimatedTokens.toLocaleString();

  return `${formattedChars} chars (~${formattedTokens} tokens)`;
}
