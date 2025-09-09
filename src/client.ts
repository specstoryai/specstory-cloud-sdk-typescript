import { HTTPClient } from './http';
import { Projects } from './resources/projects';
import { Sessions } from './resources/sessions';
import { GraphQL } from './resources/graphql';
import { LRUCache, CacheOptions } from './cache';

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  cache?: CacheOptions | false;
}

export class Client {
  private readonly http: HTTPClient;
  private readonly cache: LRUCache | null;
  
  public readonly projects: Projects;
  public readonly sessions: Sessions;
  public readonly graphql: GraphQL;

  constructor(options: ClientOptions) {
    const apiKey = options.apiKey || process.env.SPECSTORY_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'API key is required. Pass it as apiKey option or set SPECSTORY_API_KEY environment variable.',
      );
    }

    this.http = new HTTPClient({
      apiKey,
      baseUrl: options.baseUrl || 'https://cloud.specstory.com',
      timeoutMs: options.timeoutMs || 30000,
    });

    // Initialize cache if not disabled
    this.cache = options.cache === false ? null : new LRUCache(options.cache);

    this.projects = new Projects(this.http);
    this.sessions = new Sessions(this.http, this.cache);
    this.graphql = new GraphQL(this.http);
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidateCache(pattern: RegExp): void {
    this.cache?.invalidatePattern(pattern);
  }
}