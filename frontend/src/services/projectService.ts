/**
 * Project service for managing projects and collaborators
 */
import api from './api';
import {
  Project,
  ProjectWithCollaborators,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  Collaborator,
  CollaboratorInviteRequest,
} from '../types';

class ProjectService {
  /**
   * Get list of all projects for the current user
   */
  async getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  }

  /**
   * Get a single project with collaborators
   */
  async getProject(id: string): Promise<ProjectWithCollaborators> {
    const response = await api.get<ProjectWithCollaborators>(`/projects/${id}`);
    return response.data;
  }

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateRequest): Promise<Project> {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  }

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: ProjectUpdateRequest): Promise<Project> {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  }

  /**
   * Get list of collaborators for a project
   */
  async getCollaborators(projectId: string): Promise<Collaborator[]> {
    const response = await api.get<Collaborator[]>(`/projects/${projectId}/collaborators`);
    return response.data;
  }

  /**
   * Invite a collaborator to a project
   */
  async inviteCollaborator(
    projectId: string,
    data: CollaboratorInviteRequest
  ): Promise<Collaborator> {
    const response = await api.post<Collaborator>(
      `/projects/${projectId}/collaborators`,
      data
    );
    return response.data;
  }

  /**
   * Remove a collaborator from a project
   */
  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/collaborators/${userId}`);
  }
}

export default new ProjectService();
