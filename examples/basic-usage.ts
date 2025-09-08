#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';

async function main() {
  // Initialize the client with your API key
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || '',
  });

  try {
    // List all projects
    console.log('Fetching projects...');
    const projects = await client.projects.list();
    console.log(`Found ${projects.length} projects`);

    if (projects.length > 0) {
      const project = projects[0];
      console.log(`\nUsing project: ${project.name} (${project.id})`);

      // Create a new session
      console.log('\nCreating a new session...');
      const session = await client.sessions.write(project.id, {
        name: 'Test Session',
        markdown: '# Test Session\n\nThis is a test session content.',
        rawData: JSON.stringify({ test: true }),
        metadata: {
          clientName: 'example-app',
          tags: ['test', 'demo'],
        },
      }, {
        idempotencyKey: 'test-session-001',
      });
      console.log(`Created session: ${session.sessionId}`);

      // List sessions for the project
      console.log('\nListing sessions...');
      const sessions = await client.sessions.list(project.id);
      console.log(`Found ${sessions.length} sessions`);

      // Read the created session
      if (session.sessionId) {
        console.log('\nReading session details...');
        const details = await client.sessions.read(project.id, session.sessionId);
        if (details) {
          console.log(`Session name: ${details.name}`);
          console.log(`Markdown size: ${details.markdownSize} bytes`);
          console.log(`ETag: ${details.etag}`);
        }

        // Check session metadata with HEAD request
        console.log('\nChecking session metadata...');
        const metadata = await client.sessions.head(project.id, session.sessionId);
        if (metadata && metadata.exists) {
          console.log(`Session exists: ${metadata.exists}`);
          console.log(`Last modified: ${metadata.lastModified}`);
        }

        // Delete the session
        console.log('\nDeleting session...');
        const deleted = await client.sessions.delete(project.id, session.sessionId);
        console.log(`Session deleted: ${deleted}`);
      }

      // Search sessions using GraphQL
      console.log('\nSearching sessions...');
      const searchResults = await client.graphql.search('test', { limit: 10 });
      console.log(`Search found ${searchResults.total || 0} results`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);