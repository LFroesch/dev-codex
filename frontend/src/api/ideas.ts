import { BaseApiService } from './base';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  content: string;
}

export interface UpdateIdeaRequest {
  title: string;
  description?: string;
  content: string;
}

class IdeasService extends BaseApiService {
  constructor() {
    super('/ideas');
  }

  async getAll(): Promise<{ ideas: Idea[] }> {
    return this.get('');
  }

  async create(data: CreateIdeaRequest): Promise<{ idea: Idea }> {
    return this.post('', data);
  }

  async update(ideaId: string, data: UpdateIdeaRequest): Promise<{ idea: Idea }> {
    return this.put(`/${ideaId}`, data);
  }

  async deleteIdea(ideaId: string): Promise<{ message: string }> {
    return this.delete(`/${ideaId}`);
  }
}

export const ideasAPI = new IdeasService();