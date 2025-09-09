export interface DebugOptions {
  enabled: boolean;
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logCaching?: boolean;
  logTiming?: boolean;
  logger?: (message: string, data?: any) => void;
}

export class DebugLogger {
  private startTimes = new Map<string, number>();

  constructor(private options: DebugOptions) {}

  private log(category: string, message: string, data?: any): void {
    if (!this.options.enabled) return;

    const logger = this.options.logger || console.log;
    const timestamp = new Date().toISOString();
    const prefix = `[SpecStory ${category}] ${timestamp}`;

    if (data !== undefined) {
      logger(`${prefix} ${message}`, data);
    } else {
      logger(`${prefix} ${message}`);
    }
  }

  logRequest(method: string, url: string, headers?: Record<string, string>, body?: any): void {
    if (!this.options.logRequests) return;

    const requestId = `${method}-${url}-${Date.now()}`;
    if (this.options.logTiming) {
      this.startTimes.set(requestId, Date.now());
    }

    this.log('REQUEST', `${method} ${url}`, {
      headers: this.sanitizeHeaders(headers),
      ...(body && { body: this.sanitizeBody(body) }),
    });

    return requestId as any;
  }

  logResponse(
    requestId: string,
    status: number,
    headers?: Record<string, string>,
    body?: any,
  ): void {
    if (!this.options.logResponses) return;

    const duration =
      this.options.logTiming && this.startTimes.has(requestId)
        ? Date.now() - this.startTimes.get(requestId)!
        : undefined;

    if (duration !== undefined) {
      this.startTimes.delete(requestId);
    }

    this.log('RESPONSE', `Status ${status}${duration ? ` (${duration}ms)` : ''}`, {
      headers: this.sanitizeHeaders(headers),
      ...(body && { body: typeof body === 'object' ? body : { raw: body } }),
    });
  }

  logError(error: Error, context?: any): void {
    if (!this.options.logErrors) return;

    this.log('ERROR', error.message, {
      name: error.name,
      stack: error.stack,
      ...(context && { context }),
    });
  }

  logCache(action: 'hit' | 'miss' | 'set' | 'evict', key: string, data?: any): void {
    if (!this.options.logCaching) return;

    this.log('CACHE', `${action.toUpperCase()} ${key}`, data);
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    // Redact sensitive headers
    if (sanitized['Authorization']) {
      sanitized['Authorization'] = 'Bearer [REDACTED]';
    }
    if (sanitized['X-API-Key']) {
      sanitized['X-API-Key'] = '[REDACTED]';
    }

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (typeof body !== 'object' || body === null) return body;

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(body));

    // Redact sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];

    const sanitizeObject = (obj: any): void => {
      for (const key in obj) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
