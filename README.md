# SpecStory TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@specstory/sdk.svg)](https://www.npmjs.com/package/@specstory/sdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![codecov](https://codecov.io/gh/specstoryai/specstory-cloud-sdk-typescript/branch/main/graph/badge.svg)](https://codecov.io/gh/specstoryai/specstory-cloud-sdk-typescript)

The official TypeScript SDK for the SpecStory API, providing type-safe access to all SpecStory features.

## Prerequisites

Before using this SDK, you'll need:

1. **SpecStory Extension**: Install one or more SpecStory extensions in your development environment
   - Learn more: [SpecStory Introduction](https://docs.specstory.com/specstory/introduction)
   
2. **SpecStory Cloud Account**: Create an account to obtain your API key
   - Quick start guide: [SpecStory Cloud Quickstart](https://docs.specstory.com/cloud/quickstart)
   - Sign up at: [cloud.specstory.com](https://cloud.specstory.com)

3. **Node.js**: Version 18 or higher

## Installation

### From npm (coming soon)

```bash
npm install @specstory/sdk
# or
yarn add @specstory/sdk
# or
pnpm add @specstory/sdk
```

### From GitHub (for early access)

Until the package is published to npm, you can install directly from GitHub:

```bash
# Clone and build locally
git clone https://github.com/specstoryai/specstory-cloud-sdk-typescript.git
cd specstory-cloud-sdk-typescript
npm install
npm run build
npm link

# In your project
npm link @specstory/sdk
```

Or install directly from GitHub:

```bash
npm install github:specstoryai/specstory-cloud-sdk-typescript
```

## Quick Start

First, create a `.env` file in your project root:
```bash
# .env
SPECSTORY_API_KEY=your-api-key-here
```

**Important**: Add `.env` to your `.gitignore` file to keep your API key secure.

Then use the SDK:

```typescript
import { Client } from '@specstory/sdk';

// Load environment variables from .env file
// You may need to: npm install dotenv
import 'dotenv/config';

// Initialize the client with your API key
// Get your API key from: https://cloud.specstory.com/api-keys
const client = new Client({
  apiKey: process.env.SPECSTORY_API_KEY, // Required
  // Optional configuration
  baseUrl: 'https://cloud.specstory.com',  // Override for self-hosted
  timeoutMs: 30000,                       // Request timeout
  cache: {                                // Cache configuration
    maxSize: 100,
    defaultTTL: 300000  // 5 minutes
  }
});

// List projects
const projects = await client.projects.list();
console.log(`Found ${projects.length} projects`);

// Read recent sessions
const sessions = await client.sessions.recent(10);
console.log(`Found ${sessions.length} recent sessions`);
```

## Features

- 🔐 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Lightweight**: Small bundle size with zero dependencies
- 🔄 **Auto-retry**: Built-in retry logic for resilient API calls
- 📝 **Well-documented**: Extensive documentation and examples
- ⚡ **Modern**: Supports both CommonJS and ESM
- 🧪 **Tested**: Comprehensive test coverage

## API Reference

### Client Configuration

```typescript
const client = new Client({
  apiKey: string;          // Your API key
  baseURL?: string;        // API base URL (optional)
  timeout?: number;        // Request timeout in ms (default: 30000)
  maxRetries?: number;     // Max retry attempts (default: 3)
  headers?: Record<string, string>;  // Additional headers
});
```

### Projects

```typescript
// List all projects
const projects = await client.projects.list();

// Get a project by name (convenience method)
const project = await client.projects.getByName('My Project');
if (project) {
  console.log(`Found project: ${project.id}`);
}

// Update a project
const updated = await client.projects.update(projectId, {
  name: 'New Name',
  icon: '🚀',
  color: '#FF5733'
});

// Delete a project (deletes all sessions too)
const success = await client.projects.delete(projectId);
```

### Sessions

```typescript
// List sessions for a project
const sessions = await client.sessions.list(projectId);

// Read a specific session
const sessionDetail = await client.sessions.read(projectId, sessionId);
if (sessionDetail) {
  console.log(`Session name: ${sessionDetail.name}`);
  console.log(`Markdown size: ${sessionDetail.markdownSize} bytes`);
}

// Get recent sessions across all projects
const recentSessions = await client.sessions.recent(10);

// Delete a session
await client.sessions.delete(projectId, sessionId);

// Get session metadata without content
const metadata = await client.sessions.head(projectId, sessionId);
if (metadata?.exists) {
  console.log(`Last modified: ${metadata.lastModified}`);
}
```

#### GraphQL Search

```typescript
// Search across all sessions
const searchResults = await client.graphql.search('error 500', {
  limit: 20,
  filters: {
    projectId: 'specific-project-id',
    tags: ['production']
  }
});

console.log(`Found ${searchResults.total} matches`);
searchResults.results.forEach(result => {
  console.log(`${result.name} (rank: ${result.rank})`);
});

```

## Error Handling

The SDK provides typed errors for comprehensive error handling:

```typescript
import { 
  Client, 
  SpecStoryError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  NotFoundError 
} from '@specstory/sdk';

try {
  await client.sessions.read(projectId, sessionId);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Status:', error.status);
  } else if (error instanceof AuthenticationError) {
    console.error('Auth failed:', error.message);
    console.error('Check your API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited:', error.message);
    console.error('Retry after:', error.retryAfter);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    console.error('Check your connection');
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Usage

### Caching

```typescript
// Enable caching (default)
const client = new Client({
  apiKey: process.env.SPECSTORY_API_KEY,
  cache: {
    maxSize: 200,      // Cache up to 200 items
    defaultTTL: 600000 // 10 minutes
  }
});

// Disable caching
const noCache = new Client({
  apiKey: process.env.SPECSTORY_API_KEY,
  cache: false
});
```

### Conditional Requests with ETags

```typescript
// First read
const session = await client.sessions.read(projectId, sessionId);
const etag = session?.etag;

// Later, check if changed
const updated = await client.sessions.read(projectId, sessionId, etag);
if (updated === null) {
  console.log('Session has not changed');
}
```

### Debug Mode

```typescript
const client = new Client({
  apiKey: process.env.SPECSTORY_API_KEY,
  debug: true  // Enable all debug logging
});

// Or configure specific debug options
const client = new Client({
  apiKey: process.env.SPECSTORY_API_KEY,
  debug: {
    enabled: true,
    logRequests: true,
    logResponses: false,
    logCaching: true
  }
});
```

### Request Timeouts

```typescript
// Set default timeout
const client = new Client({
  apiKey: process.env.SPECSTORY_API_KEY,
  timeoutMs: 60000  // 60 seconds
});

// Override for specific request
await client.sessions.write(projectId, data, {
  timeoutMs: 120000  // 2 minutes for large uploads
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/specstoryai/specstory-cloud-sdk-typescript.git
cd specstory-cloud-sdk-typescript

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
```

## License

This SDK is distributed under the Apache License 2.0. See [LICENSE](LICENSE) for more information.

## Support

- 📧 Email: support@specstory.com
- 💬 Community: [Join our Slack](https://specstory.slack.com/join/shared_invite/zt-2vq0274ck-MYS39rgOpDSmgfE1IeK9gg#/shared-invite/email)
- 📖 Documentation: [docs.specstory.com](https://docs.specstory.com)
- 🐛 Issues: [GitHub Issues](https://github.com/specstoryai/specstory-cloud-sdk-typescript/issues)

## Links

- [NPM Package](https://www.npmjs.com/package/@specstory/sdk)
- [GitHub Repository](https://github.com/specstoryai/specstory-cloud-sdk-typescript)
- [API Documentation](https://docs.specstory.com/api)
- [Examples](https://github.com/specstoryai/specstory-cloud-sdk-typescript/tree/main/examples)