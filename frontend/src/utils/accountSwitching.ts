/**
 * Utility to handle localStorage when switching between different user accounts
 * Ensures data isolation between accounts and prevents cross-account data leaks
 */

const ACCOUNT_EMAIL_KEY = 'current_account_email';
const ACCOUNT_SCOPED_KEYS = [
  'selectedProjectId',
  'terminal_entries',
  'collapsedSections',
  'collapsedTodoSections',
  'analytics_session',
  'current_project_sync',
  'customThemes'
];

export const accountSwitchingManager = {
  /**
   * Check if user is switching to a different account
   * Returns true if switching accounts, false if same account
   */
  isAccountSwitch(currentEmail: string): boolean {
    const savedEmail = localStorage.getItem(ACCOUNT_EMAIL_KEY);
    return savedEmail !== null && savedEmail !== currentEmail;
  },

  /**
   * Clear account-specific localStorage data
   * Preserves global settings like theme
   */
  clearAccountData(): void {
    ACCOUNT_SCOPED_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Store current account email for future comparison
   */
  setCurrentAccount(email: string): void {
    localStorage.setItem(ACCOUNT_EMAIL_KEY, email);
  },

  /**
   * Get currently stored account email
   */
  getCurrentAccount(): string | null {
    return localStorage.getItem(ACCOUNT_EMAIL_KEY);
  },

  /**
   * Handle account switch - clear account-specific data if switching
   * Call this on successful login/authentication
   */
  handleAccountSwitch(newEmail: string): void {
    if (this.isAccountSwitch(newEmail)) {
      this.clearAccountData();
    }
    this.setCurrentAccount(newEmail);
  },

  /**
   * Clear all account data including the current account marker
   * Call this on logout
   */
  clearAll(): void {
    this.clearAccountData();
    localStorage.removeItem(ACCOUNT_EMAIL_KEY);
  }
};
