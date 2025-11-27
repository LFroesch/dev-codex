import axios from 'axios';
import { getCsrfToken } from '../utils/csrf';
import { toast } from '../services/toast';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000, // 30 second timeout
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

// Response interceptor: Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Connection lost. Please check your internet connection.');
      }
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message = error.response.data?.message;

    // Handle specific status codes
    switch (status) {
      case 400:
        // Bad request - usually validation errors
        if (message) {
          toast.error(message);
        }
        break;

      case 401:
        // Unauthorized - redirect to login (unless already on auth pages)
        if (!window.location.pathname.includes('/login') &&
            !window.location.pathname.includes('/register')) {
          toast.error('Session expired. Please log in again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
        break;

      case 403:
        // Forbidden
        toast.error(message || 'You don\'t have permission for this action.');
        break;

      case 404:
        // Not found
        toast.error(message || 'Resource not found.');
        break;

      case 409:
        // Conflict
        toast.error(message || 'This resource already exists.');
        break;

      case 429:
        // Rate limit
        toast.error(message || 'Too many requests. Please slow down.');
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        toast.error('Server error. Please try again in a moment.');
        break;

      default:
        // Generic error
        if (message) {
          toast.error(message);
        } else {
          toast.error('Something went wrong. Please try again.');
        }
    }

    return Promise.reject(error);
  }
);

// Note: API errors are automatically tracked by Sentry's axios integration

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