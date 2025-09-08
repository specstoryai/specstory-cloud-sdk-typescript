/**
 * Quick start example for SpecStory TypeScript SDK
 */

import { Client } from '@specstory/sdk';

async function main() {
  // Initialize client with API key
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY!
  });
  
  try {
    // List all projects
    console.log('📁 Fetching projects...');
    const projects = await client.projects.list();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      console.log('No projects found. Create one at https://cloud.specstory.com');
      return;
    }
    
    const project = projects[0];
    console.log(`\n📋 Using project: ${project.name}`);
    
    // Upload a new session
    console.log('\n📤 Creating new session...');
    const session = await client.sessions.write(project.id, {
      name: 'SDK Test Session',
      markdown: '# Test Session\n\nThis session was created using the SpecStory SDK.',
      rawData: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'typescript-sdk-quickstart'
      }),
      metadata: {
        tags: ['test', 'sdk-demo'],
        clientName: 'quickstart-example'
      }
    });
    
    console.log(`✅ Session created with ID: ${session.sessionId}`);
    
    // Search for sessions
    console.log('\n🔍 Searching for sessions...');
    const searchResults = await client.graphql.search('test');
    console.log(`Found ${searchResults.total} matching sessions`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
main();