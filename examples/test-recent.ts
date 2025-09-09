#!/usr/bin/env node
import { Client } from '../src';

async function main() {
  const apiKey = process.env.SPECSTORY_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzJ0WFdLR2o3cWc3TTRGRHNUZnJZUVJJb3VmSiIsInR5cGUiOiJhcGkiLCJzY29wZSI6WyJyZWFkIiwid3JpdGUiXSwiaWF0IjoxNzU3MzY5MTYyfQ.yGyAXUWfsMysZC9O1FIXDGGzdy0FuzuMP5gv0pu34k8';
  
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