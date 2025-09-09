#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const outputPath = path.join(__dirname, 'typescript-sdk-output.txt');
  const output: string[] = [];
  
  // Helper function to log to both console and file
  const log = (message: string) => {
    console.log(message);
    output.push(message);
  };
  // Initialize the client with your API key
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key-here',
  });

  try {
    // List all projects
    log('Fetching projects...');
    const projects = await client.projects.list();
    log(`Found ${projects.length} projects`);

    if (projects.length > 0) {
      const project = projects[0];
      log(`\nUsing project: ${project.name} (${project.id})`);

      // Create a new session
      log('\nCreating a new session...');
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
      log(`Created session: ${session.sessionId}`);

      // List sessions for the project
      log('\nListing sessions...');
      const sessions = await client.sessions.list(project.id);
      log(`Found ${sessions.length} sessions`);

      // Read the created session
      if (session.sessionId) {
        log('\nReading session details...');
        const details = await client.sessions.read(project.id, session.sessionId);
        if (details) {
          log(`Session name: ${details.name}`);
          log(`Markdown size: ${details.markdownSize} bytes`);
          log(`ETag: ${details.etag}`);
        }

        // Check session metadata with HEAD request
        log('\nChecking session metadata...');
        const metadata = await client.sessions.head(project.id, session.sessionId);
        if (metadata && metadata.exists) {
          log(`Session exists: ${metadata.exists}`);
          log(`Last modified: ${metadata.lastModified}`);
        }

        // Delete the session
        log('\nDeleting session...');
        const deleted = await client.sessions.delete(project.id, session.sessionId);
        log(`Session deleted: ${deleted}`);
      }

      // Search sessions using GraphQL
      log('\nSearching sessions...');
      const searchResults = await client.graphql.search('test', { limit: 10 });
      log(`Search found ${searchResults.total} results`);
    }
  } catch (error) {
    console.error('Error:', error);
    output.push(`\nError: ${error}`);
  }
  
  // Write output to file
  fs.writeFileSync(outputPath, output.join('\n'));
  console.log(`\nOutput written to: ${outputPath}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});