import { BaseApiService, apiClient } from './base';

// API client for analytics-related server communication
class AnalyticsService extends BaseApiService {
  constructor() {
    super('/analytics');
  }

  // Fetches analytics data for the current user
  async getUserAnalytics(days: number = 30) {
    return this.get(`/me?days=${days}`);
  }

  // Fetches analytics data for admin dashboard (specific user or current user)
  async getAdminAnalytics(userId?: string, days: number = 30) {
    const endpoint = userId ? `/user/${userId}?days=${days}` : `/me?days=${days}`;
    return this.get(endpoint);
  }

  async getActiveSession() {
    return this.get('/session/active');
  }

  // Resets all analytics data (admin only)
  async resetAllAnalytics() {
    // Use apiClient directly to avoid /analytics prefix duplication
    const response = await apiClient.delete('/admin/analytics/reset');
    return response.data;
  }

  // Resets project time tracking data (admin only)
  async resetProjectTimeData() {
    // Use apiClient directly to avoid /analytics prefix duplication
    const response = await apiClient.delete('/admin/analytics/project-time/reset');
    return response.data;
  }


  // Project Time Tracking API methods
  async getProjectsTime(days = 30) {
    return this.get(`/projects/time?days=${days}`);
  }

  async getProjectTime(projectId: string, days = 30) {
    return this.get(`/project/${projectId}/time?days=${days}`);
  }

  async switchProject(sessionId: string, newProjectId: string) {
    return this.post('/project/switch', { sessionId, newProjectId });
  }

  async getProjectTeamTime(projectId: string, days = 30) {
    return this.get(`/project/${projectId}/team-time?days=${days}`);
  }
}

// API client for public project and user data
class PublicService extends BaseApiService {
  constructor() {
    super('/public');
  }

  // Fetches public project information by identifier
  async getProject(identifier: string): Promise<{ success: boolean; project: any }> {
    return this.get(`/project/${identifier}`);
  }

  // Fetches public user profile by identifier
  async getUserProfile(identifier: string): Promise<{ success: boolean; user: any }> {
    return this.get(`/user/${identifier}`);
  }

  // Fetches public projects with optional filtering and pagination
  async getProjects(params?: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<{ 
    success: boolean; 
    projects: any[]; 
    pagination: any;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    return this.get(`/projects${queryString ? `?${queryString}` : ''}`);
  }

  // Fetches available filter options for public projects
  async getFilters(): Promise<{
    success: boolean;
    categories: string[];
    tags: string[];
  }> {
    return this.get('/filters');
  }

  // Search for public users
  async searchUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    users: any[];
    pagination: any;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return this.get(`/users/search${queryString ? `?${queryString}` : ''}`);
  }
}

export const analyticsAPI = new AnalyticsService();
export const publicAPI = new PublicService();