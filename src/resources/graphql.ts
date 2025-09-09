import { BaseResource } from './base';
import { GraphQLError } from '../errors';

export interface SearchOptions {
  filters?: Record<string, any>;
  limit?: number;
}

export interface SearchResult {
  total: number;
  results: Array<{
    id: string;
    name: string;
    projectId: string;
    rank: number;
    metadata?: {
      clientName?: string;
      tags?: string[];
    };
  }>;
}

export class GraphQL extends BaseResource {
  async search(searchQuery: string, options?: SearchOptions): Promise<SearchResult> {
    const variables: any = { query: searchQuery };

    if (options?.limit !== undefined) {
      variables.limit = options.limit;
    }

    if (options?.filters) {
      variables.filters = options.filters;
    }

    const query = `
      query SearchSessions($query: String!, $filters: SessionFilters, $limit: Int) {
        searchSessions(query: $query, filters: $filters, limit: $limit) {
          total
          results {
            id
            name
            projectId
            rank
            metadata {
              clientName
              tags
            }
          }
        }
      }
    `;

    const response = await this.request<{
      data?: { searchSessions: SearchResult };
      errors?: any[];
    }>({
      method: 'POST',
      path: '/api/v1/graphql',
      body: {
        query,
        variables,
      },
    });

    if (response.errors && response.errors.length > 0) {
      throw new GraphQLError('GraphQL query failed', response.errors, query, variables);
    }

    if (!response.data?.searchSessions) {
      throw new GraphQLError('No data returned from GraphQL query', [], query, variables);
    }

    return response.data.searchSessions;
  }

  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await this.request<{ data?: T; errors?: any[] }>({
      method: 'POST',
      path: '/api/v1/graphql',
      body: {
        query,
        variables: variables || {},
      },
    });

    if (response.errors && response.errors.length > 0) {
      throw new GraphQLError('GraphQL query failed', response.errors, query, variables);
    }

    return response.data as T;
  }
}
