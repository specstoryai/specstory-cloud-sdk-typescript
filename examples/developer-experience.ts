#!/usr/bin/env node
import { Client } from '../src';

async function demonstrateDeveloperExperience() {
  console.log('SpecStory SDK Developer Experience Features\n');

  // 1. Environment variable support
  console.log('1. Environment Variable Support:');
  
  // SDK automatically reads from environment variables
  // SPECSTORY_API_KEY, SPECSTORY_BASE_URL, SPECSTORY_TIMEOUT_MS
  const clientFromEnv = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key',
  });
  console.log('   ✅ Client created using environment variables\n');

  // 2. Debug mode
  console.log('2. Debug Logging:');
  
  const debugClient = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key',
    debug: true,  // Enable all debug logging
  });
  
  // Or with custom debug options
  const customDebugClient = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key',
    debug: {
      enabled: true,
      logRequests: true,
      logResponses: false,
      logErrors: true,
      logCaching: true,
      logTiming: true,
      logger: (message, data) => {
        console.log(`[CUSTOM] ${message}`, data ? JSON.stringify(data, null, 2) : '');
      }
    }
  });
  console.log('   ✅ Debug logging configured\n');

  // 3. Convenience methods
  console.log('3. Convenience Methods:');
  
  const apiKey = process.env.SPECSTORY_API_KEY || 'your-api-key-here';
  const client = new Client({ apiKey });

  // Get project by name
  const project = await client.projects.getByName('Test Session');
  if (project) {
    console.log(`   Found project by name: ${project.id}`);
    
    // Write and read in one operation
    const session = await client.sessions.writeAndRead(project.id, {
      name: 'DX Example Session',
      markdown: '# Developer Experience Example\n\nThis session demonstrates the SDK convenience features.',
      rawData: JSON.stringify({
        events: [
          {
            timestamp: new Date().toISOString(),
            type: 'test',
            data: { message: 'Developer experience example' }
          }
        ]
      }),
      metadata: {
        clientName: 'dx-example',
        tags: ['example', 'developer-experience']
      }
    });
    console.log(`   ✅ Created and read session: ${session.id}\n`);
  }

  // 4. Type safety and autocomplete
  console.log('4. TypeScript Benefits:');
  console.log('   - Full type safety with TypeScript');
  console.log('   - Autocomplete for all methods and properties');
  console.log('   - Inline documentation in IDE');
  console.log('   - Strict null checks for optional values\n');

  // 5. Error handling with helpful messages
  console.log('5. Developer-Friendly Errors:');
  
  try {
    const badClient = new Client({ apiKey: '' });
  } catch (error) {
    console.log(`   ✅ Clear error message: ${error.message}\n`);
  }

  // 6. Flexible configuration
  console.log('6. Flexible Configuration:');
  
  const configuredClient = new Client({
    apiKey: apiKey,
    baseUrl: 'https://cloud.specstory.com',
    timeoutMs: 60000,  // 1 minute timeout
    cache: {
      maxSize: 200,    // Cache up to 200 items
      defaultTTL: 300000  // 5 minute TTL
    },
    debug: process.env.NODE_ENV === 'development'
  });
  
  console.log('   ✅ Client configured with all options\n');

  // 7. Async iterator support
  console.log('7. Modern JavaScript Features:');
  
  if (project) {
    console.log('   Using async iterators for pagination:');
    let count = 0;
    for await (const session of client.sessions.listPaginated(project.id)) {
      count++;
      if (count > 3) break;  // Just show first 3
      console.log(`   - ${session.name}`);
    }
  }

  // 8. Zero dependencies
  console.log('\n8. Zero Dependencies:');
  console.log('   - No external dependencies');
  console.log('   - Small bundle size (~12KB)');
  console.log('   - Works in Node.js and browsers');
  console.log('   - No security vulnerabilities from deps\n');

  // Summary
  console.log('Developer Experience Summary:');
  console.log('- Environment variable support');
  console.log('- Debug logging with custom loggers');
  console.log('- Convenience methods (getByName, writeAndRead)');
  console.log('- Full TypeScript support');
  console.log('- Clear error messages');
  console.log('- Flexible configuration');
  console.log('- Modern JS features (async iterators)');
  console.log('- Zero dependencies');
}

demonstrateDeveloperExperience().catch(console.error);