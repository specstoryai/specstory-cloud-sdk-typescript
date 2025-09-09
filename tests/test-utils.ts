import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import type { Project, SessionSummary, SessionDetail, WriteSessionResponse } from '../src/types';

// Test data factories
export const createProject = (overrides?: Partial<Project>): Project => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  createdAt: '2025-01-09T12:00:00Z',
  updatedAt: '2025-01-09T12:00:00Z',
  sessionCount: 10,
  ...overrides,
});

export const createSessionSummary = (overrides?: Partial<SessionSummary>): SessionSummary => ({
  id: 'test-session-id',
  projectId: 'test-project-id',
  name: 'Test Session',
  createdAt: '2025-01-09T12:00:00Z',
  updatedAt: '2025-01-09T12:00:00Z',
  eventCount: 5,
  ...overrides,
});

export const createSessionDetail = (overrides?: Partial<SessionDetail>): SessionDetail => ({
  id: 'test-session-id',
  projectId: 'test-project-id',
  projectName: 'Test Project',
  name: 'Test Session',
  markdown: '# Test Session',
  rawData: '{"test": true}',
  createdAt: '2025-01-09T12:00:00Z',
  updatedAt: '2025-01-09T12:00:00Z',
  events: [
    {
      timestamp: '2025-01-09T12:00:00Z',
      type: 'test',
      data: { message: 'Test event' },
    },
  ],
  metadata: {
    clientName: 'test-client',
    clientVersion: '1.0.0',
  },
  ...overrides,
});

// Mock server setup
export const server = setupServer();

// Common handlers
export const handlers = {
  // Projects
  listProjects: (projects: Project[] = [createProject()]) =>
    http.get('https://cloud.specstory.com/api/v1/projects', () => {
      return HttpResponse.json({
        success: true,
        data: { projects },
      });
    }),

  updateProject: (projectId: string, updates: any) =>
    http.patch(`https://cloud.specstory.com/api/v1/projects/${projectId}`, () => {
      return HttpResponse.json({
        success: true,
        data: updates,
      });
    }),

  deleteProject: (projectId: string) =>
    http.delete(`https://cloud.specstory.com/api/v1/projects/${projectId}`, () => {
      return HttpResponse.json({
        success: true,
        data: { message: 'Project deleted' },
      });
    }),

  // Sessions
  listSessions: (projectId: string, sessions: SessionSummary[] = [createSessionSummary()]) =>
    http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions`, () => {
      return HttpResponse.json({
        success: true,
        data: { sessions },
      });
    }),

  writeSession: (projectId: string, sessionId: string, response?: Partial<WriteSessionResponse>) =>
    http.put(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
      return HttpResponse.json({
        success: true,
        data: {
          sessionId,
          projectId,
          createdAt: new Date().toISOString(),
          ...response,
        },
      });
    }),

  readSession: (projectId: string, sessionId: string, session: SessionDetail = createSessionDetail()) =>
    http.get(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
      return HttpResponse.json({
        success: true,
        data: { session },
      });
    }),

  deleteSession: (projectId: string, sessionId: string) =>
    http.delete(`https://cloud.specstory.com/api/v1/projects/${projectId}/sessions/${sessionId}`, () => {
      return HttpResponse.json({
        success: true,
      });
    }),

  // GraphQL
  graphqlQuery: (data: any) =>
    http.post('https://cloud.specstory.com/api/v1/graphql', () => {
      return HttpResponse.json({
        data,
      });
    }),

  // Error responses
  errorResponse: (path: string, status: number, code: string, message: string) =>
    http.get(path, () => {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status },
      );
    }),
};

// Test utilities
export async function captureError(fn: () => Promise<any>): Promise<any> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    return error;
  }
}

// Delay utility for testing timeouts
export function withDelay(ms: number) {
  return delay(ms);
}

// Setup and teardown
export function setupMockServer() {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

// Request tracking
export function trackRequests() {
  const requests: Request[] = [];
  
  const handler = ({ request }: { request: Request }) => {
    requests.push(request);
  };
  
  server.events.on('request:start', handler);

  return {
    get requests() {
      return [...requests];
    },
    clear() {
      requests.length = 0;
    },
    getLast() {
      return requests[requests.length - 1];
    },
    getByUrl(url: string) {
      return requests.find(req => req.url.includes(url));
    },
    cleanup() {
      server.events.removeListener('request:start', handler);
    },
  };
}