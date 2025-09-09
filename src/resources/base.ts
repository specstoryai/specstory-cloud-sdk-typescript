import type { HTTPClient, RequestOptions, WithHeaders } from '../http';

export abstract class BaseResource {
  constructor(protected readonly http: HTTPClient) {}

  protected async request<T>(options: RequestOptions): Promise<T> {
    return this.http.request<T>(options);
  }

  protected async requestWithHeaders<T>(options: RequestOptions): Promise<WithHeaders<T>> {
    return this.http.requestWithHeaders<T>(options);
  }
}
