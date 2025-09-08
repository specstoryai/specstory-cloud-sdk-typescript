import { describe, it, expect } from 'vitest';
import { Client } from '../../src/client';

describe('Client', () => {
  it('should throw error when API key is not provided', () => {
    // Remove env var for test
    const originalEnv = process.env.SPECSTORY_API_KEY;
    delete process.env.SPECSTORY_API_KEY;
    
    expect(() => new Client({ apiKey: '' })).toThrow(
      'API key is required'
    );
    
    // Restore env var
    if (originalEnv) {
      process.env.SPECSTORY_API_KEY = originalEnv;
    }
  });
  
  it('should create client with API key', () => {
    const client = new Client({ apiKey: 'test-key' });
    expect(client).toBeInstanceOf(Client);
    expect(client.projects).toBeDefined();
    expect(client.sessions).toBeDefined();
    expect(client.graphql).toBeDefined();
  });
  
  it('should use environment variable when no API key provided', () => {
    process.env.SPECSTORY_API_KEY = 'env-test-key';
    const client = new Client({ apiKey: undefined as any });
    expect(client).toBeInstanceOf(Client);
  });
});