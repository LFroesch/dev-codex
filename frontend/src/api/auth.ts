import { BaseApiService } from './base';
import type { AuthResponse, LoginData, RegisterData, User } from './types';

class AuthService extends BaseApiService {
  constructor() {
    super('/auth');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.post('/register', data);
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.post('/login', data);
  }

  async logout(): Promise<{ message: string }> {
    return this.post('/logout');
  }

  async getMe(): Promise<{ user: User }> {
    return this.get('/me');
  }

  async updateTheme(theme: string): Promise<{ message: string; user: User }> {
    return this.patch('/theme', { theme });
  }

  linkGoogle(): void {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5003'}/api/auth/google/link`;
  }

  async unlinkGoogle(): Promise<{ message: string }> {
    return this.delete('/google/unlink');
  }

  async updateProfile(data: { bio?: string; [key: string]: any }): Promise<{ message: string; user: User }> {
    return this.patch('/profile', data);
  }

  async saveCustomThemes(customThemes: any[]): Promise<{ customThemes: any[] }> {
    return this.post('/custom-themes', { customThemes });
  }

  async getCustomThemes(): Promise<{ customThemes: any[] }> {
    return this.get('/custom-themes');
  }

  async checkUsername(username: string): Promise<{ available: boolean; message: string }> {
    return this.get(`/check-username/${username}`);
  }

  async updateName(data: { firstName: string; lastName: string }): Promise<{ message: string; user: User }> {
    return this.patch('/update-name', data);
  }

  async updateUsername(data: { username: string }): Promise<{ message: string; user: User }> {
    return this.patch('/update-username', data);
  }

  async exchangeToken(token: string): Promise<{ message: string; user: User }> {
    return this.post('/exchange-token', { token });
  }
}

export const authAPI = new AuthService();