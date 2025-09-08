import { BaseResource } from './base';

export class GraphQL extends BaseResource {
  async search(query: string, filters?: unknown): Promise<unknown> {
    // TODO: Implement after types are generated
    return this.request({
      method: 'POST',
      path: '/api/v1/graphql',
      body: {
        query: `
          query SearchSessions($query: String!, $filters: SessionFilters) {
            searchSessions(query: $query, filters: $filters) {
              total
              results {
                id
                name
                rank
              }
            }
          }
        `,
        variables: { query, filters },
      },
    });
  }
}