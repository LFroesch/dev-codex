import React from 'react';

// Simple global state for tracking unsaved changes
class UnsavedChangesManager {
  private components = new Set<string>();
  private listeners = new Set<() => void>();
  private confirmationHandler: ((message: string) => Promise<boolean>) | null = null;

  setUnsavedChanges(componentId: string, hasChanges: boolean) {
    if (hasChanges) {
      this.components.add(componentId);
    } else {
      this.components.delete(componentId);
    }
    this.notifyListeners();
  }

  hasUnsavedChanges(): boolean {
    return this.components.size > 0;
  }

  clearAll() {
    this.components.clear();
    this.notifyListeners();
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  // Set a custom confirmation handler (will be called from Layout)
  setConfirmationHandler(handler: (message: string) => Promise<boolean>) {
    this.confirmationHandler = handler;
  }

  // Custom save prompt handler
  private savePromptHandler: ((message: string) => Promise<'save' | 'discard' | 'cancel'>) | null = null;

  setSavePromptHandler(handler: (message: string) => Promise<'save' | 'discard' | 'cancel'>) {
    this.savePromptHandler = handler;
  }

  async checkNavigationAllowed(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    
    const message = 'You have unsaved changes. Are you sure you want to leave this page?';
    
    if (this.confirmationHandler) {
      return await this.confirmationHandler(message);
    }
    
    // Fallback to window.confirm if no custom handler is set
    return window.confirm(message);
  }

  async checkSavePrompt(): Promise<'save' | 'discard' | 'cancel'> {
    if (!this.hasUnsavedChanges()) {
      return 'discard'; // No changes to save
    }
    
    const message = 'You have unsaved changes. What would you like to do?';
    
    if (this.savePromptHandler) {
      return await this.savePromptHandler(message);
    }
    
    // Fallback to simple confirm dialog
    const result = window.confirm('You have unsaved changes. Do you want to save before continuing?');
    return result ? 'save' : 'discard';
  }

  // Synchronous version for compatibility with existing code
  checkNavigationAllowedSync(): boolean {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    return window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
  }
}

export const unsavedChangesManager = new UnsavedChangesManager();


// Hook for React components
export const useUnsavedChanges = () => {
  const [hasChanges, setHasChanges] = React.useState(unsavedChangesManager.hasUnsavedChanges());

  React.useEffect(() => {
    const unsubscribe = unsavedChangesManager.subscribe(() => {
      setHasChanges(unsavedChangesManager.hasUnsavedChanges());
    });
    return unsubscribe;
  }, []);

  return {
    hasUnsavedChanges: hasChanges,
    setUnsavedChanges: unsavedChangesManager.setUnsavedChanges.bind(unsavedChangesManager),
    checkNavigationAllowed: unsavedChangesManager.checkNavigationAllowed.bind(unsavedChangesManager),
    checkSavePrompt: unsavedChangesManager.checkSavePrompt.bind(unsavedChangesManager)
  };
};

// Browser beforeunload protection
if (typeof window !== 'undefined') {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (unsavedChangesManager.hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return 'You have unsaved changes. Are you sure you want to leave?';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
}