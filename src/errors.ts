export class SDKError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'SDKError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SDKError);
    }
  }

  static fromResponse(response: Response, requestId?: string): SDKError {
    const statusToMessage: Record<number, string> = {
      400: 'Bad Request - The request was invalid',
      401: 'Unauthorized - Invalid API key. Get a new key at https://cloud.specstory.com/api-keys',
      403: 'Forbidden - You do not have permission to access this resource',
      404: 'Not Found - The requested resource does not exist',
      429: 'Too Many Requests - Rate limit exceeded. Please retry after some time',
      500: 'Internal Server Error - Something went wrong on our end',
      502: 'Bad Gateway - The server received an invalid response',
      503: 'Service Unavailable - The service is temporarily unavailable',
      504: 'Gateway Timeout - The server did not respond in time',
    };

    const message = statusToMessage[response.status] || `HTTP Error ${response.status}`;
    
    return new SDKError(
      message,
      response.status,
      undefined,
      undefined,
      requestId || response.headers.get('x-request-id') || undefined,
    );
  }
}