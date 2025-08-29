import { BaseApiService } from './base';

class AnalyticsService extends BaseApiService {
  constructor() {
    super('/analytics');
  }

  async getUserAnalytics(days: number = 30) {
    return this.get(`/me?days=${days}`);
  }

  async getAdminAnalytics(userId?: string, days: number = 30) {
    const endpoint = userId ? `/user/${userId}?days=${days}` : `/me?days=${days}`;
    return this.get(endpoint);
  }

  async getActiveSession() {
    return this.get('/session/active');
  }

  async resetAllAnalytics() {
    const response = await fetch('/api/admin/analytics/reset', {
      method: 'DELETE',
      credentials: 'include'
    });
    return response.json();
  }

  async resetProjectTimeData() {
    const response = await fetch('/api/admin/analytics/project-time/reset', {
      method: 'DELETE',
      credentials: 'include'
    });
    return response.json();
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

class PublicService extends BaseApiService {
  constructor() {
    super('/public');
  }

  async getProject(identifier: string): Promise<{ success: boolean; project: any }> {
    return this.get(`/project/${identifier}`);
  }

  async getUserProfile(identifier: string): Promise<{ success: boolean; user: any }> {
    return this.get(`/user/${identifier}`);
  }

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

  async getFilters(): Promise<{ 
    success: boolean; 
    categories: string[]; 
    tags: string[];
  }> {
    return this.get('/filters');
  }
}

export const analyticsAPI = new AnalyticsService();
export const publicAPI = new PublicService();