// Debug utilities for development
export const debugUtils = {
  
  // Clear rate limits for current user
  async clearUserRateLimits() {
    try {
      const response = await fetch('/api/debug/rate-limits/me', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Rate limits cleared:', result);
        return result;
      } else {
        console.error('❌ Failed to clear rate limits:', response.status);
      }
    } catch (error) {
      console.error('❌ Error clearing rate limits:', error);
    }
  },

  // Clear rate limits for current IP
  async clearIPRateLimits() {
    try {
      const response = await fetch('/api/debug/rate-limits/ip', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ IP rate limits cleared:', result);
        return result;
      } else {
        console.error('❌ Failed to clear IP rate limits:', response.status);
      }
    } catch (error) {
      console.error('❌ Error clearing IP rate limits:', error);
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
        console.log('📊 Current rate limit status:', result);
        return result;
      } else {
        console.error('❌ Failed to get rate limit status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error getting rate limit status:', error);
    }
  },

  // Quick fix for 429 errors - clears both user and IP limits
  async fixRateLimitError() {
    console.log('🔧 Fixing rate limit errors...');
    await this.clearUserRateLimits();
    await this.clearIPRateLimits();
    console.log('✅ Rate limits cleared! Try your request again.');
  }
};

// Make it available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).debugUtils = debugUtils;
  console.log('🛠️ Debug utils available at window.debugUtils');
  console.log('💡 Try: debugUtils.fixRateLimitError() if you get 429 errors');
}