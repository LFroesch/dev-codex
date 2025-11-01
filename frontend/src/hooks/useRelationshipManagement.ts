import { useState, useCallback } from 'react';
import { Doc, projectAPI } from '../api';
import { RelationshipType, ComponentRelationship } from '../../../shared/types/project';

interface UseRelationshipManagementOptions {
  projectId: string;
  selectedComponent: Doc | null;
  docs: Doc[];
  onRefresh?: () => Promise<void>;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export const useRelationshipManagement = ({
  projectId,
  selectedComponent,
  docs,
  onRefresh,
  setToast,
}: UseRelationshipManagementOptions) => {
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<RelationshipType>('uses');
  const [relationshipDescription, setRelationshipDescription] = useState('');
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editRelationshipData, setEditRelationshipData] = useState<{
    relationType: RelationshipType;
    description: string;
  }>({ relationType: 'uses', description: '' });

  const handleAddRelationship = useCallback(async (targetComponentTitle: string) => {
    if (!selectedComponent) return;

    const targetComponent = docs.find(d => d.title === targetComponentTitle);
    if (!targetComponent) {
      setToast({ message: 'Component not found', type: 'error' });
      return;
    }

    setIsAddingRelationship(true);
    try {
      await projectAPI.createRelationship(projectId, selectedComponent.id, {
        targetId: targetComponent.id,
        relationType: selectedRelationType,
        description: relationshipDescription || undefined,
      });

      // Reset form
      setRelationshipSearch('');
      setRelationshipDescription('');
      setSelectedRelationType('uses');

      setToast({ message: `Relationship added: ${selectedRelationType} → ${targetComponent.title}`, type: 'success' });

      // Refresh data from parent to get updated relationships
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to add relationship:', error);
      setToast({ message: 'Failed to add relationship', type: 'error' });
    } finally {
      setIsAddingRelationship(false);
    }
  }, [selectedComponent, docs, projectId, selectedRelationType, relationshipDescription, onRefresh, setToast]);

  const handleDeleteRelationship = useCallback(async (relationshipId: string) => {
    if (!selectedComponent) return;

    try {
      await projectAPI.deleteRelationship(projectId, selectedComponent.id, relationshipId);

      setToast({ message: 'Relationship deleted', type: 'success' });

      // Refresh data from parent to get updated relationships
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      setToast({ message: 'Failed to delete relationship', type: 'error' });
    }
  }, [selectedComponent, projectId, onRefresh, setToast]);

  const handleEditRelationship = useCallback((relationshipId: string, relationType: RelationshipType, description: string) => {
    setEditingRelationshipId(relationshipId);
    setEditRelationshipData({ relationType, description: description || '' });
  }, []);

  const handleSaveRelationship = useCallback(async () => {
    if (!selectedComponent || !editingRelationshipId) return;

    // For now, we need to delete and recreate the relationship since there's no update endpoint
    // Find the relationship to get the target
    const relationship = selectedComponent.relationships?.find((r: ComponentRelationship) => r.id === editingRelationshipId);
    if (!relationship) return;

    try {
      // Delete old relationship
      await projectAPI.deleteRelationship(projectId, selectedComponent.id, editingRelationshipId);

      // Create new relationship with updated data
      await projectAPI.createRelationship(projectId, selectedComponent.id, {
        targetId: relationship.targetId,
        relationType: editRelationshipData.relationType,
        description: editRelationshipData.description || undefined,
      });

      setToast({ message: 'Relationship updated', type: 'success' });
      setEditingRelationshipId(null);

      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to update relationship:', error);
      setToast({ message: 'Failed to update relationship', type: 'error' });
    }
  }, [selectedComponent, editingRelationshipId, editRelationshipData, projectId, onRefresh, setToast]);

  const handleCancelEditRelationship = useCallback(() => {
    setEditingRelationshipId(null);
    setEditRelationshipData({ relationType: 'uses', description: '' });
  }, []);

  return {
    showAddRelationship,
    setShowAddRelationship,
    relationshipSearch,
    setRelationshipSearch,
    selectedRelationType,
    setSelectedRelationType,
    relationshipDescription,
    setRelationshipDescription,
    isAddingRelationship,
    editingRelationshipId,
    editRelationshipData,
    setEditRelationshipData,
    handleAddRelationship,
    handleDeleteRelationship,
    handleEditRelationship,
    handleSaveRelationship,
    handleCancelEditRelationship,
  };
};
