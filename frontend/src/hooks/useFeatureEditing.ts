import { useState, useCallback } from 'react';
import { Doc, projectAPI } from '../api';
import { FeatureCategory } from '../../../shared/types/project';

interface UseFeatureEditingOptions {
  projectId: string;
  selectedFeature: Doc | null;
  onRefresh?: () => Promise<void>;
  onClose?: () => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export const useFeatureEditing = ({
  projectId,
  selectedFeature,
  onRefresh,
  onClose,
  setToast,
}: UseFeatureEditingOptions) => {
  const [isEditingFeature, setIsEditingFeature] = useState(false);
  const [editFeatureData, setEditFeatureData] = useState<{
    category: FeatureCategory;
    type: string;
    title: string;
    content: string;
    group: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'feature' | 'relationship';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'feature', id: '', name: '' });

  const handleEditFeature = useCallback(() => {
    if (!selectedFeature) return;

    setIsEditingFeature(true);
    setEditFeatureData({
      category: selectedFeature.category,
      type: selectedFeature.type,
      title: selectedFeature.title,
      content: selectedFeature.content,
      group: selectedFeature.group || '',
    });
  }, [selectedFeature]);

  const handleSaveFeature = useCallback(async () => {
    if (!selectedFeature || !editFeatureData) return;

    try {
      await projectAPI.updateFeature(projectId, selectedFeature.id, editFeatureData);

      setToast({ message: 'Feature updated', type: 'success' });
      setIsEditingFeature(false);
      setEditFeatureData(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setToast({ message: 'Failed to update feature', type: 'error' });
    }
  }, [selectedFeature, editFeatureData, projectId, onRefresh, setToast]);

  const handleCancelEditFeature = useCallback(() => {
    setIsEditingFeature(false);
    setEditFeatureData(null);
  }, []);

  const handleDeleteFeature = useCallback(async () => {
    if (!selectedFeature) return;

    try {
      await projectAPI.deleteFeature(projectId, selectedFeature.id);

      setToast({ message: 'Feature deleted', type: 'success' });
      setDeleteConfirmation({ isOpen: false, type: 'feature', id: '', name: '' });

      if (onClose) {
        onClose();
      }

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setToast({ message: 'Failed to delete feature', type: 'error' });
    }
  }, [selectedFeature, projectId, onRefresh, onClose, setToast]);

  return {
    isEditingFeature,
    setIsEditingFeature,
    editFeatureData,
    setEditFeatureData,
    deleteConfirmation,
    setDeleteConfirmation,
    handleEditFeature,
    handleSaveFeature,
    handleCancelEditFeature,
    handleDeleteFeature,
  };
};
