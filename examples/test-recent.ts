#!/usr/bin/env node
import { Client } from '../src';

async function main() {
  const apiKey = process.env.SPECSTORY_API_KEY || 'your-api-key-here';
  
  try {
    const client = new Client({ apiKey });
    
    console.log('Testing recent sessions endpoint...');
    const recentSessions = await client.sessions.recent(10);
    console.log(`Found ${recentSessions.length} recent sessions`);
    
    if (recentSessions.length > 0) {
      console.log('\nFirst recent session:');
      const session = recentSessions[0];
      console.log(`- ID: ${session.id}`);
      console.log(`- Name: ${session.name}`);
      console.log(`- Project ID: ${session.projectId}`);
      console.log(`- Created: ${session.createdAt}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();