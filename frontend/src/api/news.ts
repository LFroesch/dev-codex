import { apiClient } from './base';

export interface NewsPost {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  type: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished: boolean;
  publishedAt?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsPostRequest {
  title: string;
  content: string;
  summary?: string;
  type?: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished?: boolean;
}

export interface UpdateNewsPostRequest {
  title?: string;
  content?: string;
  summary?: string;
  type?: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished?: boolean;
}

export const newsAPI = {
  // Get all published news posts (public)
  getPublished: async (): Promise<{ posts: NewsPost[] }> => {
    const response = await apiClient.get('/news');
    return response.data;
  },

  // Get important announcements (public)
  getImportant: async (): Promise<{ posts: NewsPost[] }> => {
    const response = await apiClient.get('/news/important');
    return response.data;
  },

  // Get all news posts for admin (including drafts)
  getAll: async (): Promise<{ posts: NewsPost[] }> => {
    const response = await apiClient.get('/news/admin');
    return response.data;
  },

  // Get single news post
  getById: async (id: string): Promise<{ post: NewsPost }> => {
    const response = await apiClient.get(`/news/${id}`);
    return response.data;
  },

  // Create news post (admin only)
  create: async (data: CreateNewsPostRequest): Promise<{ post: NewsPost }> => {
    const response = await apiClient.post('/news', data);
    return response.data;
  },

  // Update news post (admin only)
  update: async (id: string, data: UpdateNewsPostRequest): Promise<{ post: NewsPost }> => {
    const response = await apiClient.put(`/news/${id}`, data);
    return response.data;
  },

  // Delete news post (admin only)
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/news/${id}`);
    return response.data;
  }
};