import { BaseResource } from './base';
import type {
  Project,
  ListProjectsResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
  DeleteProjectResponse,
} from '../types';

export class Projects extends BaseResource {
  /**
   * List all projects accessible to the authenticated user
   * @returns Array of projects
   */
  async list(): Promise<Project[]> {
    const response = await this.request<ListProjectsResponse>({
      method: 'GET',
      path: '/api/v1/projects',
    });

    return response.data.projects;
  }

  /**
   * Update a project's properties
   * @param projectId - The project ID
   * @param data - The properties to update
   * @returns The updated properties
   */
  async update(
    projectId: string,
    data: UpdateProjectRequest,
  ): Promise<UpdateProjectResponse['data']> {
    const response = await this.request<UpdateProjectResponse>({
      method: 'PATCH',
      path: `/api/v1/projects/${projectId}`,
      body: data,
    });

    return response.data;
  }

  /**
   * Delete a project and all its sessions
   * @param projectId - The project ID to delete
   * @returns Deletion details including the deleted project
   */
  async delete(projectId: string): Promise<boolean> {
    const response = await this.request<DeleteProjectResponse>({
      method: 'DELETE',
      path: `/api/v1/projects/${projectId}`,
    });

    return response.success;
  }

  /**
   * Get a project by name (convenience method)
   * @param name - The project name to search for
   * @returns The first project with matching name, or undefined if not found
   * @example
   * const project = await client.projects.getByName('My Project');
   * if (project) {
   *   console.log(`Found project: ${project.id}`);
   * }
   */
  async getByName(name: string): Promise<Project | undefined> {
    const projects = await this.list();
    return projects.find((p) => p.name === name);
  }
}
