import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Client } from '../../src';
import {
  setupMockServer,
  server,
  handlers,
  createSessionSummary,
  createSessionDetail,
  captureError,
  trackRequests,
  withDelay,
} from '../test-utils';
import { http, HttpResponse } from 'msw';
import { TimeoutError, SDKError } from '../../src/errors';

describe('Sessions Resource', () => {
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

  describe('write()', () => {
    it('should create a new session', async () => {
      const projectId = 'project-123';
      const sessionData = {
        name: 'Test Session',
        markdown: '# Test Content',
        rawData: '{"test": true}',
        metadata: {
          clientName: 'test-client',
          clientVersion: '1.0.0',
        },
      };

      server.use(
        http.put(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/:sessionId`, ({ params }) => {
          const sessionId = params.sessionId as string;
          return HttpResponse.json(
            {
              success: true,
              data: {
                sessionId,
                projectId,
                createdAt: '2025-01-09T12:00:00Z',
              },
            },
            {
              headers: {
                etag: '"abc123"',
              },
            },
          );
        }),
      );

      const result = await client.sessions.write(projectId, sessionData);

      expect(result.sessionId).toBeDefined();
      expect(result.projectId).toBe(projectId);
      expect(result.etag).toBe('"abc123"');

      // Verify request
      const request = requestTracker.getLast();
      expect(request?.method).toBe('PUT');
      const body = await request?.json();
      expect(body.name).toBe('Test Session');
      expect(body.projectName).toBe('Test Session'); // Should default to name
    });

    it('should use custom session ID if provided', async () => {
      const projectId = 'project-123';
      const customSessionId = 'custom-session-id';

      server.use(handlers.writeSession(projectId, customSessionId));

      const result = await client.sessions.write(
        projectId,
        {
          name: 'Test Session',
          markdown: '# Test',
          rawData: '{}',
        },
        { sessionId: customSessionId },
      );

      expect(result.sessionId).toBe(customSessionId);
      
      const request = requestTracker.getLast();
      expect(request?.url).toContain(customSessionId);
    });

    it('should handle idempotency key', async () => {
      const projectId = 'project-123';
      const idempotencyKey = 'unique-key-123';

      server.use(
        http.put(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/:sessionId`, ({ params }) => {
          const sessionId = params.sessionId as string;
          return HttpResponse.json({
            success: true,
            data: {
              sessionId,
              projectId,
              createdAt: '2025-01-09T12:00:00Z',
            },
          });
        }),
      );

      await client.sessions.write(
        projectId,
        {
          name: 'Test Session',
          markdown: '# Test',
          rawData: '{}',
        },
        { idempotencyKey },
      );

      const request = requestTracker.getLast();
      expect(request?.headers.get('Idempotency-Key')).toBe(idempotencyKey);
    });
  });

  describe('list()', () => {
    it('should list sessions for a project', async () => {
      const projectId = 'project-123';
      const mockSessions = [
        createSessionSummary({ id: 'session-1', name: 'Session 1' }),
        createSessionSummary({ id: 'session-2', name: 'Session 2' }),
      ];

      server.use(handlers.listSessions(projectId, mockSessions));

      const sessions = await client.sessions.list(projectId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('session-1');
      expect(sessions[1].id).toBe('session-2');
    });

    it('should handle empty session list', async () => {
      const projectId = 'project-123';

      server.use(handlers.listSessions(projectId, []));

      const sessions = await client.sessions.list(projectId);

      expect(sessions).toHaveLength(0);
      expect(sessions).toEqual([]);
    });
  });

  describe('listPaginated()', () => {
    it('should iterate through sessions', async () => {
      const projectId = 'project-123';
      const mockSessions = Array.from({ length: 5 }, (_, i) =>
        createSessionSummary({ id: `session-${i + 1}`, name: `Session ${i + 1}` }),
      );

      server.use(handlers.listSessions(projectId, mockSessions));

      const collectedSessions = [];
      for await (const session of client.sessions.listPaginated(projectId)) {
        collectedSessions.push(session);
      }

      expect(collectedSessions).toHaveLength(5);
      expect(collectedSessions[0].id).toBe('session-1');
      expect(collectedSessions[4].id).toBe('session-5');
    });
  });

  describe('read()', () => {
    it('should read a session with full details', async () => {
      const projectId = 'project-123';
      const sessionId = 'session-123';
      const mockSession = createSessionDetail({
        id: sessionId,
        projectId,
        events: [
          {
            timestamp: '2025-01-09T12:00:00Z',
            type: 'log',
            data: { message: 'Test event' },
          },
        ],
      });

      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
          return HttpResponse.json(
            {
              success: true,
              data: { session: mockSession },
            },
            {
              headers: {
                etag: '"session-etag-123"',
              },
            },
          );
        }),
      );

      const session = await client.sessions.read(projectId, sessionId);

      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.events).toHaveLength(1);
      expect(session?.etag).toBe('"session-etag-123"');
    });

    it('should handle conditional requests with ETag', async () => {
      const projectId = 'project-123';
      const sessionId = 'session-123';
      const etag = '"unchanged-etag"';

      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, ({ request }) => {
          if (request.headers.get('If-None-Match') === etag) {
            return new HttpResponse(null, { status: 304 });
          }
          return HttpResponse.json({
            success: true,
            data: { session: createSessionDetail() },
          });
        }),
      );

      const session = await client.sessions.read(projectId, sessionId, etag);

      expect(session).toBeNull(); // 304 Not Modified
      
      const request = requestTracker.getLast();
      expect(request?.headers.get('If-None-Match')).toBe(etag);
    });

    it('should use cache for subsequent requests', async () => {
      const projectId = 'project-123';
      const sessionId = 'session-123';
      const mockSession = createSessionDetail({ id: sessionId });

      let callCount = 0;
      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
          callCount++;
          return HttpResponse.json(
            {
              success: true,
              data: { session: mockSession },
            },
            {
              headers: {
                etag: '"cached-etag"',
              },
            },
          );
        }),
      );

      // First read - should hit server
      const session1 = await client.sessions.read(projectId, sessionId);
      expect(callCount).toBe(1);
      expect(session1?.etag).toBe('"cached-etag"');

      // Second read - should use cached ETag
      const session2 = await client.sessions.read(projectId, sessionId);
      expect(callCount).toBe(2);
      const lastRequest = requestTracker.getLast();
      expect(lastRequest?.headers.get('If-None-Match')).toBe('"cached-etag"');
    });
  });

  describe('delete()', () => {
    it('should delete a session', async () => {
      const projectId = 'project-123';
      const sessionId = 'session-to-delete';

      server.use(handlers.deleteSession(projectId, sessionId));

      const result = await client.sessions.delete(projectId, sessionId);

      expect(result).toBe(true);

      const request = requestTracker.getLast();
      expect(request?.method).toBe('DELETE');
    });
  });

  describe('head()', () => {
    it('should get session metadata', async () => {
      const projectId = 'project-123';
      const sessionId = 'session-123';

      server.use(
        http.head(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
          return new HttpResponse(null, {
            status: 200,
            headers: {
              etag: '"metadata-etag"',
              'content-length': '12345',
              'last-modified': 'Thu, 09 Jan 2025 12:00:00 GMT',
              'x-markdown-size': '5000',
              'x-raw-data-size': '7345',
            },
          });
        }),
      );

      const metadata = await client.sessions.head(projectId, sessionId);

      expect(metadata).not.toBeNull();
      expect(metadata?.exists).toBe(true);
      expect(metadata?.etag).toBe('"metadata-etag"');
      expect(metadata?.contentLength).toBe(12345);
      expect(metadata?.markdownSize).toBe(5000);
      expect(metadata?.rawDataSize).toBe(7345);
    });

    it('should handle 404 for non-existent session', async () => {
      const projectId = 'project-123';
      const sessionId = 'non-existent';

      server.use(
        http.head(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const metadata = await client.sessions.head(projectId, sessionId);

      expect(metadata?.exists).toBe(false);
    });
  });

  describe('recent()', () => {
    it('should get recent sessions across all projects', async () => {
      const recentSessions = [
        createSessionSummary({ id: 'recent-1', name: 'Recent Session 1' }),
        createSessionSummary({ id: 'recent-2', name: 'Recent Session 2' }),
      ];

      server.use(
        http.get('https://cloud.specstory.com/api/v1/sessions/recent', ({ request }) => {
          const url = new URL(request.url);
          const limit = url.searchParams.get('limit');
          
          return HttpResponse.json({
            success: true,
            data: { sessions: limit ? recentSessions.slice(0, parseInt(limit)) : recentSessions },
          });
        }),
      );

      const sessions = await client.sessions.recent(2);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('recent-1');
      
      const request = requestTracker.getLast();
      expect(request?.url).toContain('limit=2');
    });
  });

  describe('writeAndRead()', () => {
    it('should write and immediately read a session', async () => {
      const projectId = 'project-123';
      const sessionData = {
        name: 'Combined Test',
        markdown: '# Combined',
        rawData: '{}',
      };

      // Mock write response
      server.use(
        http.put(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/:sessionId`, ({ params }) => {
          const sessionId = params.sessionId as string;
          return HttpResponse.json({
            success: true,
            data: {
              sessionId,
              projectId,
              createdAt: '2025-01-09T12:00:00Z',
            },
          });
        }),
      );

      // Mock read response
      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/:sessionId`, ({ params }) => {
          const sessionId = params.sessionId as string;
          return HttpResponse.json({
            success: true,
            data: {
              session: createSessionDetail({
                id: sessionId,
                projectId,
                name: sessionData.name,
                markdown: sessionData.markdown,
                rawData: sessionData.rawData,
              }),
            },
          });
        }),
      );

      const session = await client.sessions.writeAndRead(projectId, sessionData);

      expect(session).toBeDefined();
      expect(session.name).toBe('Combined Test');
      expect(session.markdown).toBe('# Combined');
      
      // Should have made 2 requests (write + read)
      expect(requestTracker.requests).toHaveLength(2);
      expect(requestTracker.requests[0].method).toBe('PUT');
      expect(requestTracker.requests[1].method).toBe('GET');
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const projectId = 'project-123';
      const clientWithShortTimeout = new Client({ 
        apiKey: 'test-api-key',
        timeoutMs: 100,
      });

      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions`, async () => {
          await withDelay(200);
          return HttpResponse.json({ success: true, data: { sessions: [] } });
        }),
      );

      const error = await captureError(() => clientWithShortTimeout.sessions.list(projectId));

      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toContain('timed out after 100ms');
    });

    it('should deduplicate concurrent GET requests', async () => {
      const projectId = 'project-123';
      let callCount = 0;

      server.use(
        http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions`, async () => {
          callCount++;
          await withDelay(50);
          return HttpResponse.json({
            success: true,
            data: { sessions: [createSessionSummary()] },
          });
        }),
      );

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        client.sessions.list(projectId),
        client.sessions.list(projectId),
        client.sessions.list(projectId),
      ]);

      // Should only make 1 actual request due to deduplication
      expect(callCount).toBe(1);
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});