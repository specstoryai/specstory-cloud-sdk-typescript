# SpecStory SDK for TypeScript

Type-safe, zero-dependency SDK for SpecStory Cloud API.

## Install

```bash
npm install @specstory/sdk
```

## Quick Start

```typescript
import { Client } from '@specstory/sdk';

const client = new Client({ 
  apiKey: process.env.SPECSTORY_API_KEY! 
});

// Upload a session
const session = await client.sessions.write('project-id', {
  name: 'My Session',
  markdown: '# Session Content',
  rawData: JSON.stringify({ /* your data */ })
});

// Search across sessions
const results = await client.graphql.search('error handling');
console.log(`Found ${results.total} results`);
```

## Development Status

⚠️ **Beta SDK** - This SDK is under active development. APIs may change.

## License

MIT