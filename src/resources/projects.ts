import { BaseResource } from './base';

export class Projects extends BaseResource {
  async list(): Promise<unknown[]> {
    // TODO: Implement after types are generated
    return this.request({
      method: 'GET',
      path: '/api/v1/projects',
    });
  }
}