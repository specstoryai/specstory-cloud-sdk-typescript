#!/usr/bin/env tsx
import { Client } from '@specstory/sdk';

async function main() {
  const client = new Client({
    apiKey: process.env.SPECSTORY_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzJ0WFdLR2o3cWc3TTRGRHNUZnJZUVJJb3VmSiIsInR5cGUiOiJhcGkiLCJzY29wZSI6WyJyZWFkIiwid3JpdGUiXSwiaWF0IjoxNzU3MzY5MTYyfQ.yGyAXUWfsMysZC9O1FIXDGGzdy0FuzuMP5gv0pu34k8',
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