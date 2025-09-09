#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';

async function main() {
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key-here',
  });

  try {
    const projectId = '833c-d926-f753-7b4a';
    
    console.log('Creating session for project:', projectId);
    console.log('Request URL:', `https://cloud.specstory.com/api/v1/projects/${projectId}/sessions`);
    
    const sessionData = {
      name: 'Test Session',
      markdown: '# Test Session\n\nThis is a test session content.',
      rawData: JSON.stringify({ test: true }),
      metadata: {
        clientName: 'debug-app',
        tags: ['test', 'debug'],
      },
    };
    
    console.log('Request body:', JSON.stringify({
      ...sessionData,
      projectName: sessionData.name
    }, null, 2));
    
    const session = await client.sessions.write(projectId, sessionData, {
      idempotencyKey: 'debug-session-001',
    });
    
    console.log('Created session:', session);

  } catch (error: any) {
    console.error('Error:', error);
    if (error.details) {
      console.error('Error details:', error.details);
    }
  }
}

main().catch(console.error);