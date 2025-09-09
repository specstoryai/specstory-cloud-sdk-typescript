#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';

async function main() {
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'your-api-key-here',
  });

  try {
    // List all projects and show full details
    console.log('Fetching projects...');
    const projects = await client.projects.list();
    console.log(`Found ${projects.length} projects\n`);
    
    projects.forEach(project => {
      console.log('Project details:');
      console.log(JSON.stringify(project, null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);