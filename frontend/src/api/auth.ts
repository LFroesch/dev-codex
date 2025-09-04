import { BaseApiService } from './base';
import type { AuthResponse, LoginData, RegisterData, BaseUser } from '../../../shared/types';

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

  async getMe(): Promise<{ user: BaseUser }> {
    return this.get('/me');
  }

  async updateTheme(theme: string): Promise<{ message: string; user: BaseUser }> {
    return this.patch('/theme', { theme });
  }

  linkGoogle(): void {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5003'}/api/auth/google/link`;
  }

  async unlinkGoogle(): Promise<{ message: string }> {
    return this.delete('/google/unlink');
  }

  async updateProfile(data: { bio?: string; [key: string]: any }): Promise<{ message: string; user: BaseUser }> {
    return this.patch('/profile', data);
  }

  async saveCustomThemes(customThemes: any[]): Promise<{ customThemes: any[] }> {
    return this.post('/custom-themes', { customThemes });
  }

  async getCustomThemes(): Promise<{ customThemes: any[] }> {
    return this.get('/custom-themes');
  }
}

export const authAPI = new AuthService();