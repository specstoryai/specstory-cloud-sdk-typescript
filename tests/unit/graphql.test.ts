import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '../../src';
import { setupMockServer, server, handlers, captureError, trackRequests } from '../test-utils';
import { http, HttpResponse } from 'msw';
import { GraphQLError } from '../../src/errors';

describe('GraphQL Resource', () => {
  setupMockServer();

  let client: Client;
  let requestTracker: ReturnType<typeof trackRequests>;

  beforeEach(() => {
    client = new Client({ apiKey: 'test-api-key' });
    requestTracker = trackRequests();
    requestTracker.clear();
  });

  afterEach(() => {
    requestTracker.cleanup();
  });

  describe('search()', () => {
    it('should search sessions', async () => {
      const mockResults = {
        searchSessions: {
          total: 2,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: 'cursor1',
            endCursor: 'cursor2',
          },
          results: [
            {
              id: 'session-1',
              name: 'Session 1',
              projectId: 'project-1',
              projectName: 'Project 1',
              rank: 0.95,
              highlights: {
                markdown: ['This is a <mark>test</mark> session'],
              },
            },
            {
              id: 'session-2', 
              name: 'Session 2',
              projectId: 'project-2',
              projectName: 'Project 2',
              rank: 0.85,
              highlights: {
                markdown: ['Another <mark>test</mark> result'],
              },
            },
          ],
        },
      };

      server.use(handlers.graphqlQuery(mockResults));

      const results = await client.graphql.search('test');

      expect(results.total).toBe(2);
      expect(results.results).toHaveLength(2);
      expect(results.results[0].id).toBe('session-1');
      expect(results.results[0].rank).toBe(0.95);
      expect(results.pageInfo.hasNextPage).toBe(false);

      // Verify GraphQL query was sent
      const request = requestTracker.getLast();
      expect(request?.method).toBe('POST');
      const body = await request?.json();
      expect(body.query).toContain('query SearchSessions');
      expect(body.variables.query).toBe('test');
    });

    it('should handle search with filters', async () => {
      const mockResults = {
        searchSessions: {
          total: 1,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          results: [],
        },
      };

      server.use(handlers.graphqlQuery(mockResults));

      const results = await client.graphql.search('error', {
        filters: {
          projectIds: ['project-123', 'project-456'],
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
        },
        limit: 50,
      });

      expect(results.total).toBe(1);
      expect(results.results).toHaveLength(0);

      // Verify filters were included
      const request = requestTracker.getLast();
      const body = await request?.json();
      expect(body.variables.filters.projectIds).toEqual(['project-123', 'project-456']);
      expect(body.variables.filters.startDate).toBe('2025-01-01T00:00:00Z');
      expect(body.variables.filters.endDate).toBe('2025-01-31T23:59:59Z');
      expect(body.variables.limit).toBe(50);
    });

    it('should handle pagination with cursor', async () => {
      const mockResults = {
        searchSessions: {
          total: 100,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: true,
            startCursor: 'start',
            endCursor: 'end',
          },
          results: [],
        },
      };

      server.use(handlers.graphqlQuery(mockResults));

      await client.graphql.search('test', {
        filters: {
          cursor: 'previous-cursor',
        },
        limit: 20,
      });

      const request = requestTracker.getLast();
      const body = await request?.json();
      expect(body.variables.filters.cursor).toBe('previous-cursor');
      expect(body.variables.limit).toBe(20);
    });
  });

  describe.skip('searchIterator()', () => {
    it('should iterate through all search results', async () => {
      let page = 0;
      
      server.use(
        http.post('https://cloud.specstory.com/api/v1/graphql', async ({ request }) => {
          const body = await request.json();
          page++;
          
          if (page === 1) {
            return HttpResponse.json({
              data: {
                searchSessions: {
                  total: 3,
                  pageInfo: {
                    hasNextPage: true,
                    hasPreviousPage: false,
                    startCursor: 'start1',
                    endCursor: 'end1',
                  },
                  results: [
                    { id: 'result-1', name: 'Result 1', rank: 0.9 },
                    { id: 'result-2', name: 'Result 2', rank: 0.8 },
                  ],
                },
              },
            });
          } else {
            return HttpResponse.json({
              data: {
                searchSessions: {
                  total: 3,
                  pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: true,
                    startCursor: 'start2',
                    endCursor: 'end2',
                  },
                  results: [
                    { id: 'result-3', name: 'Result 3', rank: 0.7 },
                  ],
                },
              },
            });
          }
        }),
      );

      const results = [];
      for await (const result of client.graphql.searchIterator('test')) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('result-1');
      expect(results[1].id).toBe('result-2');
      expect(results[2].id).toBe('result-3');
    });
  });

  describe('query()', () => {
    it('should execute custom GraphQL query', async () => {
      const customQuery = `
        query GetSessionDetails($id: ID!) {
          session(id: $id) {
            id
            name
            createdAt
            events {
              timestamp
              type
            }
          }
        }
      `;

      const mockResponse = {
        session: {
          id: 'session-123',
          name: 'Custom Session',
          createdAt: '2025-01-09T12:00:00Z',
          events: [
            { timestamp: '2025-01-09T12:00:00Z', type: 'start' },
            { timestamp: '2025-01-09T12:00:01Z', type: 'log' },
          ],
        },
      };

      server.use(handlers.graphqlQuery(mockResponse));

      const result = await client.graphql.query(customQuery, { id: 'session-123' });

      expect(result.session.id).toBe('session-123');
      expect(result.session.name).toBe('Custom Session');
      expect(result.session.events).toHaveLength(2);

      // Verify custom query was sent
      const request = requestTracker.getLast();
      const body = await request?.json();
      expect(body.query).toBe(customQuery);
      expect(body.variables.id).toBe('session-123');
    });

    it('should handle mutations', async () => {
      const mutation = `
        mutation UpdateSession($id: ID!, $name: String!) {
          updateSession(id: $id, name: $name) {
            id
            name
            updatedAt
          }
        }
      `;

      const mockResponse = {
        updateSession: {
          id: 'session-123',
          name: 'Updated Name',
          updatedAt: '2025-01-09T13:00:00Z',
        },
      };

      server.use(handlers.graphqlQuery(mockResponse));

      const result = await client.graphql.query(mutation, {
        id: 'session-123',
        name: 'Updated Name',
      });

      expect(result.updateSession.name).toBe('Updated Name');
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors', async () => {
      server.use(
        http.post('https://cloud.specstory.com/api/v1/graphql', () => {
          return HttpResponse.json({
            errors: [
              {
                message: 'Invalid search query',
                extensions: {
                  code: 'BAD_USER_INPUT',
                },
              },
            ],
          });
        }),
      );

      const error = await captureError(() => client.graphql.search(''));

      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toContain('GraphQL query failed');
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    });

    it('should handle network errors', async () => {
      server.use(
        http.post('https://cloud.specstory.com/api/v1/graphql', () => {
          return HttpResponse.error();
        }),
      );

      const error = await captureError(() => client.graphql.search('test'));

      expect(error.message).toContain('Request failed');
    });

    it('should handle both data and errors in response', async () => {
      server.use(
        http.post('https://cloud.specstory.com/api/v1/graphql', () => {
          return HttpResponse.json({
            data: {
              searchSessions: {
                total: 1,
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
                results: [{ id: 'partial-result', name: 'Partial' }],
              },
            },
            errors: [
              {
                message: 'Some sessions could not be accessed',
                path: ['search', 'nodes', 1],
              },
            ],
          });
        }),
      );

      // GraphQL can return partial data with errors
      const error = await captureError(() => client.graphql.search('test'));
      
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0].message).toContain('Some sessions could not be accessed');
    });
  });
});