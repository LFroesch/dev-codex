// Debug utilities for development
import { csrfFetch } from './csrf';

export const debugUtils = {

  // Clear rate limits for current user
  async clearUserRateLimits() {
    try {
      const response = await csrfFetch('/api/debug/rate-limits/me', {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
      }
    } catch (error) {
    }
  },

  // Clear rate limits for current IP
  async clearIPRateLimits() {
    try {
      const response = await csrfFetch('/api/debug/rate-limits/ip', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
      }
    } catch (error) {
    }
  },

  // Get current rate limit status
  async getRateLimitStatus() {
    try {
      const response = await fetch('/api/debug/rate-limits/status', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
      }
    } catch (error) {
    }
  },

  // Quick fix for 429 errors - clears both user and IP limits
  async fixRateLimitError() {
    await this.clearUserRateLimits();
    await this.clearIPRateLimits();
  }
};

// Make it available globally in development
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).debugUtils = debugUtils;
}