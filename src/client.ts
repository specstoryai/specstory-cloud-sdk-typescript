import { HTTPClient } from './http';
import { Projects } from './resources/projects';
import { Sessions } from './resources/sessions';
import { GraphQL } from './resources/graphql';

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class Client {
  private readonly http: HTTPClient;
  
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

    this.projects = new Projects(this.http);
    this.sessions = new Sessions(this.http);
    this.graphql = new GraphQL(this.http);
  }
}