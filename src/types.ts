/**
 * Public types for SpecStory SDK
 * This file re-exports and simplifies types from the auto-generated file
 */

import type { components, operations } from './types.generated';

// Request/Response types
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type Project = components['schemas']['Project'];
export type ListProjectsResponse = components['schemas']['ListProjectsResponse'];
export type UpdateProjectRequest = components['schemas']['UpdateProjectRequest'];
export type UpdateProjectResponse = components['schemas']['UpdateProjectResponse'];
export type DeleteProjectResponse = components['schemas']['DeleteProjectResponse'];

export type SessionMetadata = components['schemas']['SessionMetadata'];
export type SessionSummary = components['schemas']['SessionSummary'];
export type SessionDetail = components['schemas']['SessionDetail'];
export type ListSessionsResponse = components['schemas']['ListSessionsResponse'];
export type WriteSessionRequest = components['schemas']['WriteSessionRequest'];
export type WriteSessionResponse = components['schemas']['WriteSessionResponse'];
export type SessionDetailResponse = components['schemas']['SessionDetailResponse'];
export type DeleteSessionResponse = components['schemas']['DeleteSessionResponse'];

export type GraphQLRequest = components['schemas']['GraphQLRequest'];
export type GraphQLResponse = components['schemas']['GraphQLResponse'];

// Operation types for internal use
export type ListProjectsOperation = operations['listProjects'];
export type UpdateProjectOperation = operations['updateProject'];
export type DeleteProjectOperation = operations['deleteProject'];

export type ListSessionsOperation = operations['listSessions'];
export type WriteSessionOperation = operations['writeSession'];
export type ReadSessionOperation = operations['readSession'];
export type DeleteSessionOperation = operations['deleteSession'];

export type GraphQLQueryOperation = operations['graphqlQuery'];

// Pagination options
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

// Session filters for GraphQL
export interface SessionFilters {
  projectId?: string;
  projectIds?: string[];
  clientName?: string;
  clientNames?: string[];
  agentName?: string;
  agentNames?: string[];
  deviceId?: string;
  deviceIds?: string[];
  gitBranches?: string[];
  llmModels?: string[];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  timeFilter?: string;
  searchText?: string;
}

// Search result types
export interface SearchResult {
  id: string;
  name: string;
  projectId: string;
  rank: number;
  metadata: SessionMetadata;
  matchingExchanges?: Array<{
    id: string;
    content: string;
    orderNumber: number;
  }>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  projectId?: string;
}

// Request options for methods
export interface RequestOptions {
  idempotencyKey?: string;
  timeoutMs?: number;
}