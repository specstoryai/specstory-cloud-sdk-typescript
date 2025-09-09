#!/usr/bin/env node
import { Client } from '../src';

async function demonstrateCaching() {
  const apiKey = process.env.SPECSTORY_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzJ0WFdLR2o3cWc3TTRGRHNUZnJZUVJJb3VmSiIsInR5cGUiOiJhcGkiLCJzY29wZSI6WyJyZWFkIiwid3JpdGUiXSwiaWF0IjoxNzU3MzY5MTYyfQ.yGyAXUWfsMysZC9O1FIXDGGzdy0FuzuMP5gv0pu34k8';
  
  // Create client with custom cache settings
  const client = new Client({ 
    apiKey,
    cache: {
      maxSize: 50,        // Store up to 50 items
      defaultTTL: 60000,  // 1 minute default TTL
    }
  });

  console.log('SpecStory SDK Caching Examples\n');

  // Get a project to work with
  const projects = await client.projects.list();
  if (projects.length === 0) {
    console.log('No projects found. Create a project first.');
    return;
  }
  const projectId = projects[0].id;

  // Get sessions to work with
  const sessions = await client.sessions.list(projectId, { limit: 1 });
  if (sessions.length === 0) {
    console.log('No sessions found. Create a session first.');
    return;
  }
  const sessionId = sessions[0].id;

  console.log(`Using project: ${projects[0].name} (${projectId})`);
  console.log(`Using session: ${sessions[0].name} (${sessionId})\n`);

  // Example 1: Automatic ETag handling
  console.log('1. Automatic ETag caching:');
  console.log('   First request fetches from server...');
  let startTime = Date.now();
  const session1 = await client.sessions.read(projectId, sessionId);
  let duration = Date.now() - startTime;
  console.log(`   ✅ Fetched in ${duration}ms, ETag: ${session1?.etag}`);

  console.log('   Second request uses cached ETag...');
  startTime = Date.now();
  const session2 = await client.sessions.read(projectId, sessionId);
  duration = Date.now() - startTime;
  console.log(`   ✅ Response in ${duration}ms (304 Not Modified if unchanged)`);
  console.log(`   Same data: ${JSON.stringify(session1?.id) === JSON.stringify(session2?.id)}\n`);

  // Example 2: Manual ETag usage
  console.log('2. Manual ETag handling:');
  const etag = session1?.etag;
  if (etag) {
    console.log(`   Checking with ETag: ${etag}`);
    const session3 = await client.sessions.read(projectId, sessionId, etag);
    if (session3 === null) {
      console.log('   ✅ Session not modified (304 response)');
    } else {
      console.log('   ✅ Session was modified, new data received');
    }
  }

  // Example 3: Cache invalidation
  console.log('\n3. Cache management:');
  
  // Clear specific pattern
  console.log('   Invalidating session cache...');
  client.invalidateCache(/^session:/);
  console.log('   ✅ Session cache cleared');

  // Clear all cache
  console.log('   Clearing entire cache...');
  client.clearCache();
  console.log('   ✅ All cache cleared\n');

  // Example 4: Efficient polling with ETags
  console.log('4. Efficient polling example:');
  console.log('   Polling for changes (5 times, 1 second intervals)...');
  
  let lastEtag: string | undefined;
  let unchangedCount = 0;
  
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await client.sessions.read(projectId, sessionId, lastEtag);
    
    if (result === null) {
      unchangedCount++;
      console.log(`   Poll ${i + 1}: No changes (using cached data)`);
    } else {
      console.log(`   Poll ${i + 1}: Data updated!`);
      lastEtag = result.etag;
      unchangedCount = 0;
    }
  }
  
  console.log(`\n   ✅ Polling complete: ${unchangedCount} unchanged responses saved bandwidth\n`);

  // Example 5: Disable caching
  console.log('5. Disable caching:');
  const noCacheClient = new Client({ 
    apiKey,
    cache: false  // Disable caching entirely
  });
  
  console.log('   Client created with caching disabled');
  const uncachedSession = await noCacheClient.sessions.read(projectId, sessionId);
  console.log('   ✅ Always fetches fresh data\n');

  // Summary
  console.log('Caching benefits:');
  console.log('- Reduces API calls with automatic ETag handling');
  console.log('- Improves response times for unchanged data');
  console.log('- Enables efficient polling patterns');
  console.log('- Configurable cache size and TTL');
  console.log('- Can be disabled when fresh data is critical');
}

demonstrateCaching().catch(console.error);