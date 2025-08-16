import { BaseApiService, apiClient } from './base';
import type { 
  BaseProject, ProjectResponse, CreateProjectData, UpdateProjectData,
  CreateNoteData, UpdateNoteData, BaseNote,
  CreateTodoData, UpdateTodoData, BaseTodo,
  CreateDevLogData, UpdateDevLogData, BaseDevLogEntry,
  CreateDocData, UpdateDocData, BaseDoc,
  CreateTechnologyData, BaseSelectedTechnology,
  CreatePackageData, BaseSelectedPackage
} from '../../../shared/types';

class ProjectService extends BaseApiService {
  constructor() {
    super('/projects');
  }

  async create(data: CreateProjectData): Promise<ProjectResponse> {
    return this.post('', data);
  }

  async getAll(): Promise<{ projects: BaseProject[] }> {
    return this.get('');
  }

  async getById(id: string): Promise<{ project: BaseProject }> {
    return this.get(`/${id}`);
  }

  async update(id: string, data: UpdateProjectData): Promise<ProjectResponse> {
    return this.put(`/${id}`, data);
  }

  async archive(id: string, isArchived: boolean): Promise<ProjectResponse> {
    return this.patch(`/${id}/archive`, { isArchived });
  }

  async deleteProject(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${this.endpoint}/${id}`);
    return response.data;
  }

  // Notes management
  async createNote(projectId: string, data: CreateNoteData): Promise<{ message: string; note: BaseNote }> {
    return this.post(`/${projectId}/notes`, data);
  }

  async updateNote(projectId: string, noteId: string, data: UpdateNoteData): Promise<{ message: string; note: BaseNote }> {
    return this.put(`/${projectId}/notes/${noteId}`, data);
  }

  // Note locking
  async lockNote(projectId: string, noteId: string): Promise<{ message: string; lock: any }> {
    return this.post(`/${projectId}/notes/${noteId}/lock`, {});
  }

  async unlockNote(projectId: string, noteId: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/notes/${noteId}/lock`);
  }

  async checkNoteLock(projectId: string, noteId: string): Promise<{ locked: boolean; lockedBy?: { email: string; name: string; isCurrentUser: boolean } }> {
    return this.get(`/${projectId}/notes/${noteId}/lock`);
  }

  async heartbeatNoteLock(projectId: string, noteId: string): Promise<{ message: string }> {
    return this.put(`/${projectId}/notes/${noteId}/lock/heartbeat`, {});
  }

  async deleteNote(projectId: string, noteId: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/notes/${noteId}`);
  }

  // Todo management
  async createTodo(projectId: string, data: CreateTodoData): Promise<{ message: string; todo: BaseTodo }> {
    return this.post(`/${projectId}/todos`, data);
  }

  async updateTodo(projectId: string, todoId: string, data: UpdateTodoData): Promise<{ message: string; todo: BaseTodo }> {
    return this.put(`/${projectId}/todos/${todoId}`, data);
  }

  async deleteTodo(projectId: string, todoId: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/todos/${todoId}`);
  }

  // Dev log management
  async createDevLogEntry(projectId: string, data: CreateDevLogData): Promise<{ message: string; entry: BaseDevLogEntry }> {
    return this.post(`/${projectId}/devlog`, data);
  }

  async updateDevLogEntry(projectId: string, entryId: string, data: UpdateDevLogData): Promise<{ message: string; entry: BaseDevLogEntry }> {
    return this.put(`/${projectId}/devlog/${entryId}`, data);
  }

  async deleteDevLogEntry(projectId: string, entryId: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/devlog/${entryId}`);
  }

  // Docs management
  async createDoc(projectId: string, data: CreateDocData): Promise<{ message: string; doc: BaseDoc }> {
    return this.post(`/${projectId}/docs`, data);
  }

  async updateDoc(projectId: string, docId: string, data: UpdateDocData): Promise<{ message: string; doc: BaseDoc }> {
    return this.put(`/${projectId}/docs/${docId}`, data);
  }

  async deleteDoc(projectId: string, docId: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/docs/${docId}`);
  }


  // Tech stack management
  async addTechnology(projectId: string, data: CreateTechnologyData): Promise<{ message: string; technology: BaseSelectedTechnology }> {
    return this.post(`/${projectId}/technologies`, data);
  }

  async removeTechnology(projectId: string, category: string, name: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/technologies/${category}/${encodeURIComponent(name)}`);
  }

  // Packages management
  async addPackage(projectId: string, data: CreatePackageData): Promise<{ message: string; package: BaseSelectedPackage }> {
    return this.post(`/${projectId}/packages`, data);
  }

  async removePackage(projectId: string, category: string, name: string): Promise<{ message: string }> {
    return this.delete(`/${projectId}/packages/${category}/${encodeURIComponent(name)}`);
  }
}

export const projectAPI = new ProjectService();