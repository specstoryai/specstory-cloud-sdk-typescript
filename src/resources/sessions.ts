import { BaseResource } from './base';

export class Sessions extends BaseResource {
  async write(projectId: string, data: unknown): Promise<unknown> {
    // TODO: Implement after types are generated
    return this.request({
      method: 'PUT',
      path: `/api/v1/projects/${projectId}/sessions`,
      body: data,
    });
  }

  async list(projectId: string): Promise<unknown[]> {
    // TODO: Implement after types are generated
    return this.request({
      method: 'GET',
      path: `/api/v1/projects/${projectId}/sessions`,
    });
  }
}