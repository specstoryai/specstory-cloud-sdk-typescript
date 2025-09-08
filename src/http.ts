import { SDKError } from './errors';
import {
  SDK_VERSION,
  SDK_LANGUAGE,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY_MS,
  IDEMPOTENT_METHODS,
  RETRY_STATUS_CODES,
} from './constants';

interface HTTPClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
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

export class HTTPClient {
  constructor(private readonly config: HTTPClientConfig) {}

  async request<T>(options: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${options.path}`;
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = options.retries ?? DEFAULT_MAX_RETRIES;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
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
          const error = SDKError.fromResponse(response);
          
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

        return await response.json() as T;
        
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
        
        throw new SDKError(
          `Request failed: ${lastError.message}`,
          undefined,
          'network_error',
          { originalError: lastError.message },
        );
      }
    }

    throw new SDKError(
      `Request failed after ${maxRetries + 1} attempts`,
      undefined,
      'max_retries_exceeded',
      { lastError: lastError?.message },
    );
  }

  private shouldRetry(method: string): boolean {
    return IDEMPOTENT_METHODS.has(method);
  }

  private async delay(attempt: number): Promise<void> {
    const jitter = Math.random() * 100;
    const delay = DEFAULT_BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}