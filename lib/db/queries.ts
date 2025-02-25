import 'server-only';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { TraceFunction } from '../tracer';
import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod'; // Ensure Zod is imported
import { logger } from '../logger';  // Assuming you've configured Winston logger in 'lib/logger'
import typia, { type tags } from "typia";

import {
  user,
  chat,
  document,
  suggestion,
  message,
  vote,
  type User,
  type Suggestion,
  type Message,
} from './schema';

// Ensure BlockKind is an enum with string values for zod validation
export enum BlockKind {
  Text = 'text',
  Code = 'code',
  Image = 'image'
}

// Create Zod schema for BlockKind validation
const BlockKindSchema = z.nativeEnum(BlockKind);

const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

// Zod Schemas for validation
const userSelectSchema = createSelectSchema(user);
const userInsertSchema = createInsertSchema(user);
const userUpdateSchema = createUpdateSchema(user);
const chatSelectSchema = createSelectSchema(chat);
const messageSelectSchema = createSelectSchema(message);
const voteSelectSchema = createSelectSchema(vote);
const suggestionSelectSchema = createSelectSchema(suggestion);
const documentSelectSchema = createSelectSchema(document);

export type IValidation<T> = IValidation.ISuccess<T> | IValidation.IFailure;
export namespace IValidation {
  export interface ISuccess<T> {
    success: true;
    data: T;
  }
  export interface IFailure {
    success: false;
    errors: IError[];
    data: unknown;
  }
  export interface IError {
    path: string;
    expected: string;
    value: any;
  }
}

class DbActions {
  @TraceFunction
  async getUser(email: string): Promise<Array<User>> {
    try {
      const data = await db.select().from(user).where(eq(user.email, email));
      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);

      if (!res.success) {
        logger.error('Validation failed for getUser', {
          email,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getUser validation passed successfully', {
          email,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get user from database', { email, error });
      throw error;
    }
  }

  @TraceFunction 
  async createUser(email: string, password: string) {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
  
    try {
      const userData = { email, password: hash };
      logger.info('Creating user', { email, userData });

      return await db.insert(user).values(userData);
    } catch (error) {
      logger.error('Failed to create user in database', { email, error });
      throw error;
    }
  }

  @TraceFunction 
  async saveChat({
    id,
    userId,
    title,
  }: {
    id: string;
    userId: string;
    title: string;
  }) {
    try {
      const data = { id, createdAt: new Date(), userId, title };
      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);

      if (!res.success) {
        logger.error('Validation failed for saveChat', {
          data,
          errors: res.errors,
        });
      } else {
        logger.info('saveChat validation passed successfully', {
          data,
        });
      }

      return await db.insert(chat).values(data);
    } catch (error) {
      logger.error('Failed to save chat in database', { error });
      throw error;
    }
  }

  @TraceFunction 
  async deleteChatById({ id }: { id: string }) {
    try {
      await db.delete(vote).where(eq(vote.chatId, id));
      await db.delete(message).where(eq(message.chatId, id));
  
      const res = await db.delete(chat).where(eq(chat.id, id));
      logger.info('deleteChatById result', { id, res });
      return res;
    } catch (error) {
      logger.error('Failed to delete chat by id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async getChatsByUserId({ id }: { id: string }) {
    try {
      const data = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, id))
        .orderBy(desc(chat.createdAt));

      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);
      if (!res.success) {
        logger.error('Validation failed for getChatsByUserId', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getChatsByUserId validation passed successfully', {
          id,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get chats by user from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async getChatById({ id }: { id: string }) {
    try {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
      const res: typia.IValidation<typeof selectedChat> = typia.validateEquals<typeof selectedChat>(selectedChat);

      if (!res.success) {
        logger.error('Validation failed for getChatById', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getChatById validation passed successfully', {
          id,
          data: res.data
        });
      }

      return selectedChat;
    } catch (error) {
      logger.error('Failed to get chat by id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async saveMessages({ messages }: { messages: Array<Message> }) {
    try {
      const res: typia.IValidation<typeof messages> = typia.validateEquals<typeof messages>(messages);

      if (!res.success) {
        logger.error('Validation failed for saveMessages', {
          messages,
          errors: res.errors
        });
      } else {
        logger.info('saveMessages validation passed successfully', {
          messages
        });
      }

      return await db.insert(message).values(messages);
    } catch (error) {
      logger.error('Failed to save messages in database', { error });
      throw error;
    }
  }

  @TraceFunction 
  async getMessagesByChatId({ id }: { id: string }) {
    try {
      const data = await db
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(asc(message.createdAt));
        
      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);
      if (!res.success) {
        logger.error('Validation failed for getMessagesByChatId', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getMessagesByChatId validation passed successfully', {
          id,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get messages by chat id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async voteMessage({
    chatId,
    messageId,
    type,
  }: {
    chatId: string;
    messageId: string;
    type: 'up' | 'down';
  }) {
    try {
      const [existingVote] = await db
        .select()
        .from(vote)
        .where(and(eq(vote.messageId, messageId)));
  
      if (existingVote) {
        return await db
          .update(vote)
          .set({ isUpvoted: type === 'up' })
          .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
      }

      const voteData = { chatId, messageId, isUpvoted: type === 'up' };
      const res: typia.IValidation<typeof voteData> = typia.validateEquals<typeof voteData>(voteData);

      if (!res.success) {
        logger.error('Validation failed for voteMessage', {
          voteData,
          errors: res.errors
        });
      } else {
        logger.info('voteMessage validation passed successfully', {
          voteData
        });
      }

      return await db.insert(vote).values(voteData);
    } catch (error) {
      logger.error('Failed to upvote message in database', { error });
      throw error;
    }
  }

  @TraceFunction 
  async getVotesByChatId({ id }: { id: string }) {
    try {
      const data = await db.select().from(vote).where(eq(vote.chatId, id));

      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);
      if (!res.success) {
        logger.error('Validation failed for getVotesByChatId', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getVotesByChatId validation passed successfully', {
          id,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get votes by chat id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async saveDocument({
    id,
    title,
    kind,
    content,
    userId,
  }: {
    id: string;
    title: string;
    kind: BlockKind;
    content: string;
    userId: string;
  }) {
    try {
      const documentData = { id, title, kind, content, userId, createdAt: new Date() };
      const res: typia.IValidation<typeof documentData> = typia.validateEquals<typeof documentData>(documentData);

      if (!res.success) {
        logger.error('Validation failed for saveDocument', {
          documentData,
          errors: res.errors
        });
      } else {
        logger.info('saveDocument validation passed successfully', {
          documentData
        });
      }

      return await db.insert(document).values(documentData);
    } catch (error) {
      logger.error('Failed to save document in database', { error });
      throw error;
    }
  }

  @TraceFunction 
  async getDocumentsById({ id }: { id: string }) {
    try {
      const documents = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(asc(document.createdAt));

      const res: typia.IValidation<typeof documents> = typia.validateEquals<typeof documents>(documents);
      if (!res.success) {
        logger.error('Validation failed for getDocumentsById', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getDocumentsById validation passed successfully', {
          id,
          data: res.data
        });
      }

      return documents;
    } catch (error) {
      logger.error('Failed to get documents by id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async getDocumentById({ id }: { id: string }) {
    try {
      const [selectedDocument] = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(desc(document.createdAt));

      const res: typia.IValidation<typeof selectedDocument> = typia.validateEquals<typeof selectedDocument>(selectedDocument);
      if (!res.success) {
        logger.error('Validation failed for getDocumentById', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getDocumentById validation passed successfully', {
          id,
          data: res.data
        });
      }

      return selectedDocument;
    } catch (error) {
      logger.error('Failed to get document by id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp,
  }: {
    id: string;
    timestamp: Date;
  }) {
    try {
      await db
        .delete(suggestion)
        .where(
          and(
            eq(suggestion.documentId, id),
            gt(suggestion.documentCreatedAt, timestamp),
          ),
        );

      const res = await db
        .delete(document)
        .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));

      logger.info('deleteDocumentsByIdAfterTimestamp result', {
        id,
        timestamp,
        res
      });
      return res;
    } catch (error) {
      logger.error('Failed to delete documents by id after timestamp from database', {
        id,
        timestamp,
        error
      });
      throw error;
    }
  }

  @TraceFunction 
  async saveSuggestions({
    suggestions,
  }: {
    suggestions: Array<Suggestion>;
  }) {
    try {
      const res: typia.IValidation<typeof suggestions> = typia.validateEquals<typeof suggestions>(suggestions);

      if (!res.success) {
        logger.error('Validation failed for saveSuggestions', {
          suggestions,
          errors: res.errors
        });
      } else {
        logger.info('saveSuggestions validation passed successfully', {
          suggestions
        });
      }

      return await db.insert(suggestion).values(suggestions);
    } catch (error) {
      logger.error('Failed to save suggestions in database', { error });
      throw error;
    }
  }

  @TraceFunction 
  async getSuggestionsByDocumentId({
    documentId,
  }: {
    documentId: string;
  }) {
    try {
      const data = await db
        .select()
        .from(suggestion)
        .where(and(eq(suggestion.documentId, documentId)));

      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);
      if (!res.success) {
        logger.error('Validation failed for getSuggestionsByDocumentId', {
          documentId,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getSuggestionsByDocumentId validation passed successfully', {
          documentId,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get suggestions by document version from database', { documentId, error });
      throw error;
    }
  }

  @TraceFunction 
  async getMessageById({ id }: { id: string }) {
    try {
      const data = await db.select().from(message).where(eq(message.id, id));
      const res: typia.IValidation<typeof data> = typia.validateEquals<typeof data>(data);

      if (!res.success) {
        logger.error('Validation failed for getMessageById', {
          id,
          errors: res.errors,
          data: res.data
        });
      } else {
        logger.info('getMessageById validation passed successfully', {
          id,
          data: res.data
        });
      }

      return data;
    } catch (error) {
      logger.error('Failed to get message by id from database', { id, error });
      throw error;
    }
  }

  @TraceFunction 
  async deleteMessagesByChatIdAfterTimestamp({
    chatId,
    timestamp,
  }: {
    chatId: string;
    timestamp: Date;
  }) {
    try {
      const res = await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
        );

      logger.info('deleteMessagesByChatIdAfterTimestamp result', {
        chatId,
        timestamp,
        res
      });
      return res;
    } catch (error) {
      logger.error(
        'Failed to delete messages by id after timestamp from database',
        { chatId, timestamp, error }
      );
      throw error;
    }
  }

  @TraceFunction 
  async updateChatVisiblityById({
    chatId,
    visibility,
  }: {
    chatId: string;
    visibility: 'private' | 'public';
  }) {
    try {
      const res = await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));

      logger.info('updateChatVisiblityById result', {
        chatId,
        visibility,
        res
      });
      return res;
    } catch (error) {
      logger.error('Failed to update chat visibility in database', { chatId, visibility, error });
      throw error;
    }
  }
}

export const dbActions = new DbActions();
