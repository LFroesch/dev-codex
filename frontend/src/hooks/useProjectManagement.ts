import { useState } from 'react';
import { projectAPI, analyticsAPI, ideasAPI } from '../api';
import type { Project } from '../api/types';
import { toast } from '../services/toast';
import { handleAPIError } from '../services/errorService';

export const useProjectManagement = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTimeData, setProjectTimeData] = useState<{ [projectId: string]: number }>({});
  const [ideasCount, setIdeasCount] = useState(0);

  // Group projects by category
  const groupProjectsByCategory = (projectList: Project[]) => {
    const grouped: { [category: string]: Project[] } = {};

    projectList.forEach(project => {
      const category = project.category || 'General';
      // Capitalize first letter of each word
      const normalizedCategory = category.split(' ').map((word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      if (!grouped[normalizedCategory]) {
        grouped[normalizedCategory] = [];
      }
      grouped[normalizedCategory].push(project);
    });

    // Sort projects within each category by recently updated
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA; // Most recent first
      });
    });

    return grouped;
  };

  // Loads project time data - called on heartbeat for real-time updates
  const loadProjectTimeData = async () => {
    try {
      const response = await analyticsAPI.getProjectsTime(30) as any;
      if (response && response.projects && Array.isArray(response.projects)) {
        const timeMap: { [projectId: string]: number } = {};
        response.projects.forEach((project: any) => {
          timeMap[project._id] = project.totalTime || 0;
        });
        setProjectTimeData(timeMap);
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        const timeMap: { [projectId: string]: number } = {};
        response.forEach((project: any) => {
          timeMap[project._id] = project.totalTime || 0;
        });
        setProjectTimeData(timeMap);
      }
    } catch (err) {
      console.error('Failed to load project time data:', err);
    }
  };

  const loadIdeasCount = async () => {
    try {
      const response = await ideasAPI.getAll();
      setIdeasCount(response.ideas.length);
    } catch (err) {
      console.error('Failed to load ideas count:', err);
    }
  };

  const formatProjectTime = (projectId: string): string => {
    const timeMs = projectTimeData[projectId] || 0;
    const totalMinutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  };

  const loadProjects = async (selectedProject?: Project | null, setSelectedProject?: (project: Project | null) => void) => {
    try {
      const projectsResponse = await projectAPI.getAll();
      setProjects(projectsResponse.projects);

      // If there's a currently selected project, update it with fresh data
      if (selectedProject && setSelectedProject) {
        const updatedSelectedProject = projectsResponse.projects.find(p => p.id === selectedProject.id);
        if (updatedSelectedProject) {
          setSelectedProject(updatedSelectedProject);
        }
      }

      // Load project time data
      await loadProjectTimeData();

      // Load ideas count
      await loadIdeasCount();

    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const handleProjectUpdate = async (projectId: string, updatedData: any, selectedProject?: Project | null, setSelectedProject?: (project: Project | null) => void) => {
    try {
      if (!projectId || projectId === 'undefined') {
        throw new Error('Invalid project ID');
      }

      const response = await projectAPI.update(projectId, updatedData);
      await loadProjects(selectedProject, setSelectedProject);
      toast.success('Project updated successfully!');
      return response;
    } catch (error: any) {
      handleAPIError(error, {
        component: 'Layout',
        action: 'update_project',
        projectId
      });
      throw error;
    }
  };

  const handleProjectArchive = async (projectId: string, isArchived: boolean, selectedProject?: Project | null, setSelectedProject?: (project: Project | null) => void) => {
    try {
      await projectAPI.archive(projectId, isArchived);
      await loadProjects(selectedProject, setSelectedProject);
      toast.success(isArchived ? 'Project archived successfully!' : 'Project restored successfully!');
    } catch (error: any) {
      handleAPIError(error, {
        component: 'Layout',
        action: isArchived ? 'archive_project' : 'restore_project',
        projectId
      });
      throw error;
    }
  };

  const handleProjectDelete = async (projectId: string, selectedProject?: Project | null, setSelectedProject?: (project: Project | null) => void) => {
    try {
      await projectAPI.deleteProject(projectId);
      await loadProjects(selectedProject, setSelectedProject);
      if (selectedProject?.id === projectId && setSelectedProject) {
        setSelectedProject(null);
      }
      toast.success('Project deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete project. Please try again.');
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  return {
    projects,
    setProjects,
    projectTimeData,
    setProjectTimeData,
    ideasCount,
    setIdeasCount,
    groupProjectsByCategory,
    loadProjectTimeData,
    loadIdeasCount,
    formatProjectTime,
    loadProjects,
    handleProjectUpdate,
    handleProjectArchive,
    handleProjectDelete
  };
};
