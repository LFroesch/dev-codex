import { useState, useEffect } from 'react';

export type ModalMode = 'view' | 'edit';

interface UseItemModalOptions<T> {
  initialMode?: ModalMode;
  /**
   * Optional function to sync item with latest data from a source
   * Typically used to update modal item when parent data changes
   */
  onItemSync?: (currentItem: T | null, isOpen: boolean) => T | null | undefined;
}

interface UseItemModalReturn<T> {
  item: T | null;
  isOpen: boolean;
  mode: ModalMode;
  open: (item: T, mode?: ModalMode) => void;
  close: () => void;
  setMode: (mode: ModalMode) => void;
  setItem: (item: T | null) => void;
}

/**
 * Custom hook for managing modal state with an item
 * Consolidates common modal patterns: open/close, view/edit mode, item selection
 *
 * @example
 * ```tsx
 * const noteModal = useItemModal<Note>({ initialMode: 'view' });
 *
 * // Open modal with item
 * noteModal.open(note, 'view');
 *
 * // Close modal
 * noteModal.close();
 *
 * // Switch to edit mode
 * noteModal.setMode('edit');
 * ```
 */
export function useItemModal<T = any>(
  options: UseItemModalOptions<T> = {}
): UseItemModalReturn<T> {
  const { initialMode = 'view', onItemSync } = options;

  const [item, setItem] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>(initialMode);

  // Sync item with external data source if provided
  useEffect(() => {
    if (onItemSync && item && isOpen) {
      const syncedItem = onItemSync(item, isOpen);
      if (syncedItem) {
        setItem(syncedItem);
      }
    }
  }, [onItemSync, item, isOpen]);

  const open = (newItem: T, newMode: ModalMode = initialMode) => {
    setItem(newItem);
    setMode(newMode);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setItem(null);
    setMode(initialMode);
  };

  return {
    item,
    isOpen,
    mode,
    open,
    close,
    setMode,
    setItem,
  };
}
