import axios from 'axios';
import { getCsrfToken } from '../utils/csrf';
import { analyticsService } from '../services/analytics';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// CSRF Protection: Add CSRF token to all state-changing requests
apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();

  // Only add CSRF token to state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method || '')) {
    const token = await getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Error Tracking: Track API errors for analytics
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Track errors that are 400+ status codes
    if (error.response && error.response.status >= 400) {
      try {
        // Don't track auth errors (401, 403) to avoid noise
        if (error.response.status !== 401 && error.response.status !== 403) {
          await analyticsService.trackError({
            name: `API Error ${error.response.status}`,
            message: error.response.data?.error || error.message,
            context: {
              url: error.config?.url,
              method: error.config?.method,
              status: error.response.status,
              statusText: error.response.statusText
            },
            severity: error.response.status >= 500 ? 'high' : 'medium'
          });
        }
      } catch (trackingError) {
        // Silently fail if error tracking fails
        console.error('Failed to track API error:', trackingError);
      }
    }

    return Promise.reject(error);
  }
);

// Base class for API services providing common HTTP methods
export class BaseApiService {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  // Sends GET request to the endpoint
  protected async get<T>(path = ''): Promise<T> {
    const response = await apiClient.get(`${this.endpoint}${path}`);
    return response.data;
  }

  // Sends POST request with optional data
  protected async post<T>(path = '', data?: any): Promise<T> {
    const response = await apiClient.post(`${this.endpoint}${path}`, data);
    return response.data;
  }

  // Sends PUT request with optional data
  protected async put<T>(path = '', data?: any): Promise<T> {
    const response = await apiClient.put(`${this.endpoint}${path}`, data);
    return response.data;
  }

  // Sends PATCH request with optional data
  protected async patch<T>(path = '', data?: any): Promise<T> {
    const response = await apiClient.patch(`${this.endpoint}${path}`, data);
    return response.data;
  }

  // Sends DELETE request to the endpoint
  protected async delete<T>(path = ''): Promise<T> {
    const response = await apiClient.delete(`${this.endpoint}${path}`);
    return response.data;
  }
}