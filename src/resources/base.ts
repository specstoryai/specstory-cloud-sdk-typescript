import type { HTTPClient, RequestOptions } from '../http';

export abstract class BaseResource {
  constructor(protected readonly http: HTTPClient) {}

  protected async request<T>(options: RequestOptions): Promise<T> {
    return this.http.request<T>(options);
  }
}