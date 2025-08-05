import React from 'react';

// Simple global state for tracking unsaved changes
class UnsavedChangesManager {
  private components = new Set<string>();
  private listeners = new Set<() => void>();

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

  checkNavigationAllowed(): boolean {
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
    checkNavigationAllowed: unsavedChangesManager.checkNavigationAllowed.bind(unsavedChangesManager)
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