export interface ErrorContext {
  method?: string;
  url?: string;
  requestId?: string;
  timestamp?: Date;
  duration?: number;
  retryCount?: number;
}

export interface ErrorDetails {
  code?: string;
  details?: unknown;
  suggestion?: string;
}

/**
 * Base error class for all SDK errors
 */
export abstract class SDKError extends Error {
  public readonly context: ErrorContext;
  public readonly details: ErrorDetails;

  constructor(
    message: string,
    public readonly status?: number,
    details?: ErrorDetails,
    context?: ErrorContext,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.details = details || {};
    this.context = context || {};

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a curl command to reproduce the request
   */
  getCurlCommand(): string | undefined {
    if (!this.context.method || !this.context.url) return undefined;

    const parts = ['curl'];
    parts.push('-X', this.context.method);
    parts.push(`'${this.context.url}'`);

    if (this.context.requestId) {
      parts.push('-H', `'x-request-id: ${this.context.requestId}'`);
    }

    return parts.join(' ');
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      details: this.details,
      context: this.context,
      stack: this.stack,
    };
  }

  static fromResponse(response: Response, context?: ErrorContext): SDKError {
    const status = response.status;
    const requestId = response.headers.get('x-request-id') || undefined;

    const errorContext: ErrorContext = {
      ...context,
      requestId: requestId || context?.requestId,
    };

    // Map status codes to specific error types
    switch (status) {
      case 400:
        return new ValidationError('The request was invalid', errorContext);
      case 401:
        return new AuthenticationError(
          'Invalid API key',
          {
            suggestion: 'Get a new API key at https://cloud.specstory.com/api-keys',
          },
          errorContext,
        );
      case 403:
        return new PermissionError(
          'You do not have permission to access this resource',
          errorContext,
        );
      case 404:
        return new NotFoundError('The requested resource does not exist', errorContext);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        return new RateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          errorContext,
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(`Server error: ${status}`, status, errorContext);
      default:
        return new UnknownError(`Unexpected error: ${status}`, status, errorContext);
    }
  }
}

/**
 * Network-related errors (connection failures, timeouts)
 */
export class NetworkError extends SDKError {
  constructor(
    message: string,
    public readonly cause?: Error,
    context?: ErrorContext,
  ) {
    super(
      message,
      undefined,
      {
        code: 'network_error',
        suggestion: 'Check your internet connection and try again',
      },
      context,
    );
  }
}

/**
 * Validation errors for bad requests
 */
export class ValidationError extends SDKError {
  constructor(
    message: string,
    context?: ErrorContext,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(
      message,
      400,
      {
        code: 'validation_error',
        details: fields,
        suggestion: 'Check the request parameters and try again',
      },
      context,
    );
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends SDKError {
  constructor(message: string, details?: ErrorDetails, context?: ErrorContext) {
    super(
      message,
      401,
      {
        code: 'authentication_error',
        ...details,
      },
      context,
    );
  }
}

/**
 * Permission/authorization errors
 */
export class PermissionError extends SDKError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      403,
      {
        code: 'permission_error',
        suggestion: 'Ensure you have the necessary permissions for this resource',
      },
      context,
    );
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends SDKError {
  constructor(message: string, context?: ErrorContext) {
    super(
      message,
      404,
      {
        code: 'not_found',
        suggestion: 'Verify the resource ID and try again',
      },
      context,
    );
  }
}

/**
 * Rate limiting errors with retry information
 */
export class RateLimitError extends SDKError {
  public readonly retryAfter: Date | undefined;

  constructor(message: string, retryAfterSeconds?: number, context?: ErrorContext) {
    const retryAfter = retryAfterSeconds
      ? new Date(Date.now() + retryAfterSeconds * 1000)
      : undefined;

    super(
      message,
      429,
      {
        code: 'rate_limit',
        details: { retryAfterSeconds },
        suggestion: retryAfter
          ? `Retry after ${retryAfter.toISOString()}`
          : 'Reduce request frequency and try again',
      },
      context,
    );

    this.retryAfter = retryAfter;
  }
}

/**
 * Server errors (5xx)
 */
export class ServerError extends SDKError {
  constructor(message: string, status: number, context?: ErrorContext) {
    super(
      message,
      status,
      {
        code: 'server_error',
        suggestion: 'The server encountered an error. Please try again later',
      },
      context,
    );
  }
}

/**
 * GraphQL-specific errors
 */
export class GraphQLError extends SDKError {
  constructor(
    message: string,
    public readonly errors: Array<{ message: string; extensions?: any }>,
    public readonly query?: string,
    public readonly variables?: Record<string, any>,
    context?: ErrorContext,
  ) {
    super(
      message,
      200,
      {
        code: 'graphql_error',
        details: { errors, query, variables },
        suggestion: 'Check the GraphQL query syntax and variables',
      },
      context,
    );
  }
}

/**
 * Unknown/unexpected errors
 */
export class UnknownError extends SDKError {
  constructor(message: string, status?: number, context?: ErrorContext) {
    super(
      message,
      status,
      {
        code: 'unknown_error',
        suggestion: 'An unexpected error occurred. Please report this issue',
      },
      context,
    );
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends SDKError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    context?: ErrorContext,
  ) {
    super(
      message,
      undefined,
      {
        code: 'timeout',
        details: { timeoutMs },
        suggestion: `Request timed out after ${timeoutMs}ms. Try increasing the timeout`,
      },
      context,
    );
  }
}

// Re-export for backwards compatibility
export { SDKError as SpecStoryError };
