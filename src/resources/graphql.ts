import { BaseResource } from './base';

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
  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const variables: any = { query };
    
    if (options?.limit !== undefined) {
      variables.limit = options.limit;
    }
    
    if (options?.filters) {
      variables.filters = options.filters;
    }
    
    const response = await this.request<{ data: { searchSessions: SearchResult } }>({
      method: 'POST',
      path: '/api/v1/graphql',
      body: {
        query: `
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
        `,
        variables,
      },
    });
    
    return response.data.searchSessions;
  }
  
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      path: '/api/v1/graphql',
      body: {
        query,
        variables: variables || {},
      },
    });
    
    return response;
  }
}