#!/usr/bin/env node
import { 
  Client,
  SDKError,
  NetworkError,
  TimeoutError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  ServerError,
  GraphQLError,
} from '../src';

async function demonstrateErrorHandling() {
  // Test with invalid API key
  const invalidClient = new Client({ 
    apiKey: 'invalid-key',
    timeoutMs: 5000,
  });

  console.log('Testing error handling with invalid API key...\n');

  try {
    await invalidClient.projects.list();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log('✅ Caught AuthenticationError:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.details.code}`);
      console.log(`   Suggestion: ${error.details.suggestion}`);
      console.log(`   Request ID: ${error.context.requestId}`);
      console.log(`   Duration: ${error.context.duration}ms`);
      console.log(`   Curl command: ${error.getCurlCommand()}`);
      console.log();
    }
  }

  // Test network error (bad base URL)
  const networkErrorClient = new Client({
    apiKey: 'test-key',
    baseUrl: 'https://invalid-domain-that-does-not-exist.com',
    timeoutMs: 3000,
  });

  console.log('Testing network error handling...\n');

  try {
    await networkErrorClient.projects.list();
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log('✅ Caught NetworkError:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Code: ${error.details.code}`);
      console.log(`   Suggestion: ${error.details.suggestion}`);
      console.log();
    }
  }

  // Test timeout error
  const timeoutClient = new Client({
    apiKey: 'test-key',
    timeoutMs: 1, // 1ms timeout to force timeout
  });

  console.log('Testing timeout error handling...\n');

  try {
    await timeoutClient.projects.list();
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.log('✅ Caught TimeoutError:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Timeout: ${error.timeoutMs}ms`);
      console.log(`   Suggestion: ${error.details.suggestion}`);
      console.log();
    } else if (error instanceof NetworkError) {
      // Sometimes shows as network error on very short timeouts
      console.log('✅ Caught NetworkError (timeout):');
      console.log(`   Message: ${error.message}`);
      console.log();
    }
  }

  // Test 404 error with valid client
  const apiKey = process.env.SPECSTORY_API_KEY || 'your-api-key-here';
  const client = new Client({ apiKey });

  console.log('Testing 404 error handling...\n');

  try {
    await client.sessions.read('invalid-project-id', 'invalid-session-id');
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log('✅ Caught NotFoundError:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Suggestion: ${error.details.suggestion}`);
      console.log();
    }
  }

  // Test GraphQL error
  console.log('Testing GraphQL error handling...\n');

  try {
    // Invalid GraphQL query
    await client.graphql.query(`
      query InvalidQuery {
        thisFieldDoesNotExist
      }
    `);
  } catch (error) {
    if (error instanceof GraphQLError) {
      console.log('✅ Caught GraphQLError:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Errors:`, error.errors);
      console.log(`   Query: ${error.query?.slice(0, 50)}...`);
      console.log();
    } else if (error instanceof SDKError) {
      console.log('✅ Caught SDKError (GraphQL):');
      console.log(`   Message: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log();
    }
  }

  // Test error serialization
  console.log('Testing error serialization...\n');
  
  try {
    await invalidClient.projects.list();
  } catch (error) {
    if (error instanceof SDKError) {
      const serialized = error.toJSON();
      console.log('✅ Error serialized to JSON:');
      console.log(JSON.stringify(serialized, null, 2));
    }
  }
}

demonstrateErrorHandling().catch(console.error);