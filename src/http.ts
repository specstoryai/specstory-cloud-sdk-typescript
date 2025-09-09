import { SDKError, NetworkError, TimeoutError, ErrorContext } from './errors';
import {
  SDK_VERSION,
  SDK_LANGUAGE,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY_MS,
  IDEMPOTENT_METHODS,
  RETRY_STATUS_CODES,
} from './constants';
import { DebugLogger } from './debug';

interface HTTPClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  keepAlive?: boolean;
  maxConnections?: number;
  debugLogger?: DebugLogger | null;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  idempotencyKey?: string;
  retries?: number;
}

export interface WithHeaders<T> {
  data: T;
  headers: Record<string, string>;
}

export class HTTPClient {
  private requestQueue = new Map<string, Promise<any>>();
  private debugLogger: DebugLogger | null;

  constructor(private readonly config: HTTPClientConfig) {
    this.debugLogger = config.debugLogger || null;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${options.path}`;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = options.retries ?? DEFAULT_MAX_RETRIES;
    const startTime = Date.now();

    // Request deduplication for GET requests
    if (options.method === 'GET') {
      const requestKey = `${options.method}:${url}`;
      const existingRequest = this.requestQueue.get(requestKey);
      if (existingRequest) {
        return existingRequest as Promise<T>;
      }

      const requestPromise = this.performRequest<T>(options, url, timeoutMs, maxRetries, startTime);
      this.requestQueue.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        this.requestQueue.delete(requestKey);
        return result;
      } catch (error) {
        this.requestQueue.delete(requestKey);
        throw error;
      }
    }

    return this.performRequest<T>(options, url, timeoutMs, maxRetries, startTime);
  }

  private async performRequest<T>(
    options: RequestOptions,
    url: string,
    timeoutMs: number,
    maxRetries: number,
    startTime: number,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `specstory-sdk-${SDK_LANGUAGE}/${SDK_VERSION}`,
      'X-SDK-Version': SDK_VERSION,
      'X-SDK-Language': SDK_LANGUAGE,
      ...options.headers,
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    let lastError: Error | undefined;

    // Log request
    this.debugLogger?.logRequest(options.method, url, headers, options.body);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const context: ErrorContext = {
            method: options.method,
            url,
            timestamp: new Date(),
            duration: Date.now() - startTime,
            retryCount: attempt,
          };
          const error = SDKError.fromResponse(response, context);

          // Only retry on specific status codes and methods
          if (
            attempt < maxRetries &&
            (RETRY_STATUS_CODES.has(response.status) ||
              (options.method === 'POST' && options.idempotencyKey && response.status >= 500))
          ) {
            await this.delay(attempt);
            continue;
          }

          throw error;
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        // Handle HEAD requests
        if (options.method === 'HEAD') {
          return {
            headers: Object.fromEntries(response.headers),
            status: response.status,
          } as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof SDKError) {
          throw error;
        }

        // Network errors or timeouts
        lastError = error as Error;

        if (attempt < maxRetries && this.shouldRetry(options.method)) {
          await this.delay(attempt);
          continue;
        }

        const context: ErrorContext = {
          method: options.method,
          url,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          retryCount: attempt,
        };

        // Check if it's a timeout error
        if (lastError.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs, context);
        }

        throw new NetworkError(`Request failed: ${lastError.message}`, lastError, context);
      }
    }

    throw new NetworkError(`Request failed after ${maxRetries + 1} attempts`, lastError, {
      method: options.method,
      url,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      retryCount: maxRetries + 1,
    });
  }

  private shouldRetry(method: string): boolean {
    return IDEMPOTENT_METHODS.has(method);
  }

  private async delay(attempt: number): Promise<void> {
    const jitter = Math.random() * 100;
    const delay = DEFAULT_BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async requestWithHeaders<T>(options: RequestOptions): Promise<WithHeaders<T>> {
    const url = `${this.config.baseUrl}${options.path}`;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = options.retries ?? DEFAULT_MAX_RETRIES;
    const startTime = Date.now();

    // Request deduplication for GET requests
    if (options.method === 'GET') {
      const requestKey = `${options.method}:${url}:with-headers`;
      const existingRequest = this.requestQueue.get(requestKey);
      if (existingRequest) {
        return existingRequest as Promise<WithHeaders<T>>;
      }

      const requestPromise = this.performRequestWithHeaders<T>(
        options,
        url,
        timeoutMs,
        maxRetries,
        startTime,
      );
      this.requestQueue.set(requestKey, requestPromise);

      try {
        const result = await requestPromise;
        this.requestQueue.delete(requestKey);
        return result;
      } catch (error) {
        this.requestQueue.delete(requestKey);
        throw error;
      }
    }

    return this.performRequestWithHeaders<T>(options, url, timeoutMs, maxRetries, startTime);
  }

  private async performRequestWithHeaders<T>(
    options: RequestOptions,
    url: string,
    timeoutMs: number,
    maxRetries: number,
    startTime: number,
  ): Promise<WithHeaders<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `specstory-sdk-${SDK_LANGUAGE}/${SDK_VERSION}`,
      'X-SDK-Version': SDK_VERSION,
      'X-SDK-Language': SDK_LANGUAGE,
      ...options.headers,
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const context: ErrorContext = {
            method: options.method,
            url,
            timestamp: new Date(),
            duration: Date.now() - startTime,
            retryCount: attempt,
          };
          const error = SDKError.fromResponse(response, context);

          // Only retry on specific status codes and methods
          if (
            attempt < maxRetries &&
            (RETRY_STATUS_CODES.has(response.status) ||
              (options.method === 'POST' && options.idempotencyKey && response.status >= 500))
          ) {
            await this.delay(attempt);
            continue;
          }

          throw error;
        }

        const responseHeaders = Object.fromEntries(response.headers);

        // Handle 204 No Content
        if (response.status === 204) {
          return { data: undefined as T, headers: responseHeaders };
        }

        // Handle HEAD requests
        if (options.method === 'HEAD') {
          return {
            data: {
              headers: responseHeaders,
              status: response.status,
            } as T,
            headers: responseHeaders,
          };
        }

        const data = (await response.json()) as T;
        return { data, headers: responseHeaders };
      } catch (error) {
        if (error instanceof SDKError) {
          throw error;
        }

        // Network errors or timeouts
        lastError = error as Error;

        if (attempt < maxRetries && this.shouldRetry(options.method)) {
          await this.delay(attempt);
          continue;
        }

        const context: ErrorContext = {
          method: options.method,
          url,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          retryCount: attempt,
        };

        // Check if it's a timeout error
        if (lastError.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs, context);
        }

        throw new NetworkError(`Request failed: ${lastError.message}`, lastError, context);
      }
    }

    throw new NetworkError(`Request failed after ${maxRetries + 1} attempts`, lastError, {
      method: options.method,
      url,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      retryCount: maxRetries + 1,
    });
  }
}
