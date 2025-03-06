import { ArtifactKind } from '@/components/artifact';

/**
 * This file contains simplified type definitions for database entities
 * specifically designed for typia schema generation.
 * These types match the structure of DB records but without Postgres-specific metadata.
 */

export interface UserSchema {
  id: string;
  email: string;
  password: string;
}

export interface ChatSchema {
  id: string;
  createdAt: Date | string;
  userId: string;
  title: string;
  visibility?: 'private' | 'public';
}

export interface MessageSchema {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date | string;
}

export interface VoteSchema {
  messageId: string;
  chatId: string;
  isUpvoted: boolean;
}

export interface DocumentSchema {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  createdAt: Date | string;
}

export interface SuggestionSchema {
  id: string;
  documentId: string;
  content: string;
  documentCreatedAt: Date | string;
  createdAt: Date | string;
}

// Response type schemas for common DB queries
export interface GetUserResponse extends Array<UserSchema> {}
export interface GetChatByIdResponse extends ChatSchema {}
export interface GetChatsByUserIdResponse extends Array<ChatSchema> {}
export interface GetMessagesByIdResponse extends Array<MessageSchema> {}
export interface GetDocumentByIdResponse extends DocumentSchema {}
export interface GetDocumentsResponse extends Array<DocumentSchema> {}
export interface GetSuggestionsResponse extends Array<SuggestionSchema> {}
export interface GetVotesResponse extends Array<VoteSchema> {}

// Parameter schemas for common DB queries
export interface GetByIdParams {
  id: string;
}
