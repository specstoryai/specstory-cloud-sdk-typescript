import { BaseResource } from './base';
import type {
  SessionSummary,
  SessionDetail,
  ListSessionsResponse,
  WriteSessionRequest,
  WriteSessionResponse,
  SessionDetailResponse,
  DeleteSessionResponse,
  PaginationOptions,
  RequestOptions,
} from '../types';
import { LRUCache } from '../cache';
import { HTTPClient } from '../http';

export interface WriteSessionOptions extends RequestOptions {
  projectName?: string;
  sessionId?: string;
}

export class Sessions extends BaseResource {
  constructor(
    protected http: HTTPClient,
    private cache: LRUCache | null = null,
  ) {
    super(http);
  }
  /**
   * Write (create or update) a session
   * @param projectId - The project ID
   * @param data - The session data
   * @param options - Additional options including idempotency key
   * @returns Session creation details including ID and ETag
   */
  async write(
    projectId: string,
    data: Omit<WriteSessionRequest, 'projectName'>,
    options?: WriteSessionOptions,
  ): Promise<WriteSessionResponse['data'] & { etag?: string }> {
    const body: WriteSessionRequest = {
      ...data,
      projectName: options?.projectName || data.name,
    };

    // Generate session ID if not provided
    const sessionId = options?.sessionId || crypto.randomUUID();

    const response = await this.requestWithHeaders<WriteSessionResponse>({
      method: 'PUT',
      path: `/api/v1/projects/${projectId}/sessions/${sessionId}`,
      body,
      idempotencyKey: options?.idempotencyKey,
      timeoutMs: options?.timeoutMs,
    });

    // Extract ETag from headers if available
    const etag = response.headers?.['etag'];

    return {
      ...response.data.data,
      ...(etag && { etag }),
    };
  }

  /**
   * List sessions for a project
   * @param projectId - The project ID
   * @param options - Pagination options
   * @returns Array of session summaries with ETags
   * @example
   * // List all sessions for a project
   * const sessions = await client.sessions.list('project-id');
   * sessions.forEach(session => {
   *   console.log(`${session.name}: ${session.id}`);
   * });
   */
  async list(projectId: string, _options?: PaginationOptions): Promise<SessionSummary[]> {
    const response = await this.request<ListSessionsResponse>({
      method: 'GET',
      path: `/api/v1/projects/${projectId}/sessions`,
    });

    return response.data.sessions;
  }

  /**
   * List sessions with pagination (async iterator)
   * @param projectId - The project ID
   * @param options - Pagination options
   * @yields Session summaries
   */
  async *listPaginated(
    projectId: string,
    options?: PaginationOptions,
  ): AsyncGenerator<SessionSummary, void, unknown> {
    // For now, yield all sessions at once
    // TODO: Implement proper cursor-based pagination when API supports it
    const sessions = await this.list(projectId, options);

    for (const session of sessions) {
      yield session;
    }
  }

  /**
   * Read a specific session
   * @param projectId - The project ID
   * @param sessionId - The session ID
   * @param ifNoneMatch - Optional ETag for conditional request
   * @returns Session details or null if not modified
   * @example
   * // Read a session
   * const session = await client.sessions.read(projectId, sessionId);
   * if (session) {
   *   console.log(`Events: ${session.events.length}`);
   *   console.log(`ETag: ${session.etag}`);
   * }
   *
   * @example
   * // Conditional read with ETag
   * const session = await client.sessions.read(projectId, sessionId, lastEtag);
   * if (session === null) {
   *   console.log('Session has not changed');
   * }
   */
  async read(
    projectId: string,
    sessionId: string,
    ifNoneMatch?: string,
  ): Promise<(SessionDetail & { etag?: string }) | null> {
    const cacheKey = `session:${projectId}:${sessionId}`;

    // Check cache if no explicit etag provided
    if (!ifNoneMatch && this.cache) {
      const cached = this.cache.getEntry(cacheKey);
      if (cached) {
        // Use cached etag for conditional request
        ifNoneMatch = cached.etag;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }

    try {
      const response = await this.requestWithHeaders<SessionDetailResponse>({
        method: 'GET',
        path: `/api/v1/projects/${projectId}/sessions/${sessionId}`,
        headers,
      });

      // Extract ETag from response headers
      const etag = response.headers?.['etag'];

      const result = {
        ...response.data.data.session,
        ...(etag && { etag }),
      };

      // Cache the response
      if (this.cache && etag) {
        this.cache.set(cacheKey, result, { etag, ttl: 300000 }); // 5 minute TTL
      }

      return result;
    } catch (error: any) {
      // Return null for 304 Not Modified
      if (error.status === 304) {
        // Return cached version if available
        if (this.cache) {
          const cached = this.cache.get(cacheKey);
          if (cached) {
            return cached;
          }
        }
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a session
   * @param projectId - The project ID
   * @param sessionId - The session ID
   * @returns Success confirmation
   */
  async delete(projectId: string, sessionId: string): Promise<boolean> {
    const response = await this.request<DeleteSessionResponse>({
      method: 'DELETE',
      path: `/api/v1/projects/${projectId}/sessions/${sessionId}`,
    });

    return response.success;
  }

  /**
   * Get session metadata without content
   * @param projectId - The project ID
   * @param sessionId - The session ID
   * @param ifNoneMatch - Optional ETag for conditional request
   * @returns Session metadata or null if not modified
   */
  async head(
    projectId: string,
    sessionId: string,
    ifNoneMatch?: string,
  ): Promise<{
    exists: boolean;
    etag?: string;
    contentLength?: number;
    lastModified?: string;
    markdownSize?: number;
    rawDataSize?: number;
  } | null> {
    const headers: Record<string, string> = {};

    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }

    try {
      const response = await this.requestWithHeaders<any>({
        method: 'HEAD',
        path: `/api/v1/projects/${projectId}/sessions/${sessionId}`,
        headers,
      });

      return {
        exists: true,
        etag: response.headers?.['etag'],
        contentLength: response.headers?.['content-length']
          ? parseInt(response.headers['content-length'], 10)
          : undefined,
        lastModified: response.headers?.['last-modified'],
        markdownSize: response.headers?.['x-markdown-size']
          ? parseInt(response.headers['x-markdown-size'], 10)
          : undefined,
        rawDataSize: response.headers?.['x-raw-data-size']
          ? parseInt(response.headers['x-raw-data-size'], 10)
          : undefined,
      };
    } catch (error: any) {
      // Return null for 304 Not Modified
      if (error.status === 304) {
        return null;
      }
      // Return exists: false for 404
      if (error.status === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Get recent sessions across all projects
   * @param limit - Number of sessions to return (1-100, default 5)
   * @returns Array of recent session summaries
   */
  async recent(limit?: number): Promise<SessionSummary[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) {
      params.append('limit', limit.toString());
    }

    const queryString = params.toString();
    const path = queryString ? `/api/v1/sessions/recent?${queryString}` : '/api/v1/sessions/recent';

    const response = await this.request<ListSessionsResponse>({
      method: 'GET',
      path,
    });

    return response.data.sessions;
  }

  /**
   * Write and immediately read a session (convenience method)
   * @param projectId - The project ID
   * @param data - The session data to write
   * @param options - Optional write options
   * @returns The written session details
   * @example
   * const session = await client.sessions.writeAndRead(projectId, {
   *   events: [...],
   *   metadata: { clientName: 'test' }
   * });
   */
  async writeAndRead(
    projectId: string,
    data: WriteSessionRequest,
    options?: WriteSessionOptions,
  ): Promise<SessionDetail & { etag?: string }> {
    // First write the session
    const writeResult = await this.write(projectId, data, options);

    // Then read it back with full details
    const sessionId = writeResult.sessionId;
    const fullSession = await this.read(projectId, sessionId);

    if (!fullSession) {
      throw new Error('Failed to read session after write');
    }

    return fullSession;
  }
}
