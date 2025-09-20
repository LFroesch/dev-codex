import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, 
});

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