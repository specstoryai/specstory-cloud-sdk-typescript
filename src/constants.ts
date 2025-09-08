export const SDK_VERSION = '0.1.0';
export const SDK_LANGUAGE = 'typescript';

export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BASE_DELAY_MS = 200;

export const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE', 'HEAD']);

export const RETRY_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);