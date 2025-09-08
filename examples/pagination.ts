#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';

async function main() {
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || '',
  });

  try {
    const projects = await client.projects.list();
    if (projects.length === 0) {
      console.log('No projects found');
      return;
    }

    const project = projects[0];
    console.log(`Using project: ${project.name}`);

    // Create multiple sessions for pagination demo
    console.log('\nCreating test sessions...');
    const sessionPromises = [];
    for (let i = 0; i < 10; i++) {
      sessionPromises.push(
        client.sessions.write(project.id, {
          name: `Pagination Test ${i}`,
          markdown: `# Session ${i}\n\nThis is test content for pagination.`,
          rawData: JSON.stringify({ index: i }),
          metadata: {
            clientName: 'pagination-demo',
            tags: ['pagination', 'test'],
          },
        }, {
          idempotencyKey: `pagination-test-${i}`,
        })
      );
    }

    await Promise.all(sessionPromises);
    console.log('Created 10 test sessions');

    // Use async iterator for pagination
    console.log('\nIterating through sessions with pagination:');
    let count = 0;
    for await (const session of client.sessions.listPaginated(project.id)) {
      console.log(`  ${++count}. ${session.name} - Created: ${session.createdAt}`);
      
      // Demonstrate conditional fetching with ETag
      if (session.etag && count === 1) {
        console.log(`\n  Checking if session ${session.id} was modified...`);
        const unchanged = await client.sessions.read(
          project.id, 
          session.id,
          session.etag
        );
        console.log(`  Session modified: ${unchanged !== null}\n`);
      }
    }

    // Clean up - delete all test sessions
    console.log('\nCleaning up test sessions...');
    const allSessions = await client.sessions.list(project.id);
    const testSessions = allSessions.filter(s => 
      s.name.startsWith('Pagination Test')
    );

    const deletePromises = testSessions.map(session =>
      client.sessions.delete(project.id, session.id)
    );

    await Promise.all(deletePromises);
    console.log(`Deleted ${testSessions.length} test sessions`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);