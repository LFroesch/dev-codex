import { useState, useCallback } from 'react';
import { Doc, projectAPI } from '../api';
import { ComponentCategory } from '../../../shared/types/project';

interface UseComponentEditingOptions {
  projectId: string;
  selectedComponent: Doc | null;
  onRefresh?: () => Promise<void>;
  onClose?: () => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export const useComponentEditing = ({
  projectId,
  selectedComponent,
  onRefresh,
  onClose,
  setToast,
}: UseComponentEditingOptions) => {
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [editComponentData, setEditComponentData] = useState<{
    category: ComponentCategory;
    type: string;
    title: string;
    content: string;
    feature: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'component' | 'relationship';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'component', id: '', name: '' });

  const handleEditComponent = useCallback(() => {
    if (!selectedComponent) return;

    setIsEditingComponent(true);
    setEditComponentData({
      category: selectedComponent.category,
      type: selectedComponent.type,
      title: selectedComponent.title,
      content: selectedComponent.content,
      feature: selectedComponent.feature || '',
    });
  }, [selectedComponent]);

  const handleSaveComponent = useCallback(async () => {
    if (!selectedComponent || !editComponentData) return;

    try {
      await projectAPI.updateComponent(projectId, selectedComponent.id, editComponentData);

      setToast({ message: 'Component updated', type: 'success' });
      setIsEditingComponent(false);
      setEditComponentData(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setToast({ message: 'Failed to update component', type: 'error' });
    }
  }, [selectedComponent, editComponentData, projectId, onRefresh, setToast]);

  const handleCancelEditComponent = useCallback(() => {
    setIsEditingComponent(false);
    setEditComponentData(null);
  }, []);

  const handleDeleteComponent = useCallback(async () => {
    if (!selectedComponent) return;

    try {
      await projectAPI.deleteComponent(projectId, selectedComponent.id);

      setToast({ message: 'Component deleted', type: 'success' });
      setDeleteConfirmation({ isOpen: false, type: 'component', id: '', name: '' });

      if (onClose) {
        onClose();
      }

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setToast({ message: 'Failed to delete component', type: 'error' });
    }
  }, [selectedComponent, projectId, onRefresh, onClose, setToast]);

  return {
    isEditingComponent,
    setIsEditingComponent,
    editComponentData,
    setEditComponentData,
    deleteConfirmation,
    setDeleteConfirmation,
    handleEditComponent,
    handleSaveComponent,
    handleCancelEditComponent,
    handleDeleteComponent,
  };
};
