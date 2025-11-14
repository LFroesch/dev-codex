import { BaseApiService } from './base';

class AdminService extends BaseApiService {
  constructor() {
    super('/admin');
  }

  async sendNotificationToUser(
    userId: string,
    data: { title: string; message: string }
  ): Promise<{
    message: string;
    notification: {
      id: string;
      title: string;
      message: string;
      recipient: {
        id: string;
        email: string;
        name: string;
      };
    };
  }> {
    return this.post(`/users/${userId}/notify`, data);
  }
}

export const adminAPI = new AdminService();
