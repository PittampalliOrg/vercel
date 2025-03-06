// lib/db/queries.ts
import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import typia from 'typia';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Import schemas from the dedicated typia file
import { schemas } from '../generated/jsonschemas';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
} from './schema';

import { ArtifactKind } from '@/components/artifact';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const tracer = trace.getTracer('db-actions');

/** Utility to get parameters & awaited returns without overshadowing built-in ReturnType */
export type MethodParams<T extends (...args: any) => any> = Parameters<T>;
export type MethodReturn<T extends (...args: any) => any> = Awaited<ReturnType<T>>;

/**
 * Decorator that wraps methods with:
 * - Parameter & return validation (via `typia.is`)
 * - OpenTelemetry tracing (creates or continues a Span)
 * - Attaches the relevant schemas as trace attributes
 */
function ValidateAndLog(target: any, methodName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    // Possibly continue an existing trace context
    const activeCtx = context.active();
    const span = tracer.startSpan(`DbActions.${methodName}`, undefined, activeCtx);

    // Retrieve paramSchema & returnSchema from imported schemas
    const { paramSchema, returnSchema } = schemas[methodName as keyof typeof schemas] || {};

    try {
      // Attach the generated schemas to the span for debugging
      if (paramSchema) {
        span.setAttribute(`schemas.${methodName}.param`, JSON.stringify(paramSchema));
      }
      if (returnSchema) {
        span.setAttribute(`schemas.${methodName}.return`, JSON.stringify(returnSchema));
      }

      // Parameter validation
      if (paramSchema) {
        const paramValidation = typia.is(args);
        span.addEvent('Parameter Validation', {
          expected: JSON.stringify(paramSchema),
          received: JSON.stringify(args),
          validationPassed: paramValidation,
        });
      }

      // Invoke the original method
      const result = await originalMethod.apply(this, args);

      // Return validation
      if (returnSchema) {
        const resultValidation = typia.is(result);
        span.addEvent('Return Validation', {
          expected: JSON.stringify(returnSchema),
          received: JSON.stringify(result),
          validationPassed: resultValidation,
        });
        span.setAttribute('return.result', JSON.stringify(result));
      }

      return result;
    } catch (error: any) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
      throw error;
    } finally {
      span.end();
    }
  };
}

/**
 * The DbActions class, each method decorated by @ValidateAndLog.
 */
export class DbActions {
  @ValidateAndLog
  async getUser(email: string): Promise<User[]> {
    return db.select().from(user).where(eq(user.email, email));
  }

  @ValidateAndLog
  async createUser(email: string, password: string) {
    const hash = hashSync(password, genSaltSync(10));
    return db.insert(user).values({ email, password: hash });
  }

  @ValidateAndLog
  async saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
    return db.insert(chat).values({ id, createdAt: new Date(), userId, title });
  }

  @ValidateAndLog
  async deleteChatById({ id }: { id: string }) {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    return db.delete(chat).where(eq(chat.id, id));
  }

  @ValidateAndLog
  async getChatsByUserId({ id }: { id: string }) {
    return db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  }

  @ValidateAndLog
  async getChatById({ id }: { id: string }) {
    const [result] = await db.select().from(chat).where(eq(chat.id, id));
    return result;
  }

  @ValidateAndLog
  async saveMessages({ messages }: { messages: Message[] }) {
    return db.insert(message).values(messages);
  }

  @ValidateAndLog
  async getMessagesByChatId({ id }: { id: string }) {
    return db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  }

  @ValidateAndLog
  async voteMessage({
    chatId,
    messageId,
    type,
  }: {
    chatId: string;
    messageId: string;
    type: 'up' | 'down';
  }) {
    const [existingVote] = await db.select().from(vote).where(eq(vote.messageId, messageId));
    if (existingVote) {
      return db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return db.insert(vote).values({ chatId, messageId, isUpvoted: type === 'up' });
  }

  @ValidateAndLog
  async getVotesByChatId({ id }: { id: string }) {
    return db.select().from(vote).where(eq(vote.chatId, id));
  }

  @ValidateAndLog
  async saveDocument({
    id,
    title,
    kind,
    content,
    userId,
  }: {
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string;
    userId: string;
  }) {
    return db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  }

  @ValidateAndLog
  async getDocumentsById({ id }: { id: string }) {
    return db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));
  }

  @ValidateAndLog
  async getDocumentById({ id }: { id: string }) {
    const [result] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));
    return result;
  }

  @ValidateAndLog
  async deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp,
  }: {
    id: string;
    timestamp: Date;
  }) {
    await db
      .delete(suggestion)
      .where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));
    return db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  }

  @ValidateAndLog
  async saveSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
    return db.insert(suggestion).values(suggestions);
  }

  @ValidateAndLog
  async getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
    return db.select().from(suggestion).where(eq(suggestion.documentId, documentId));
  }

  @ValidateAndLog
  async getMessageById({ id }: { id: string }) {
    return db.select().from(message).where(eq(message.id, id));
  }

  @ValidateAndLog
  async deleteMessagesByChatIdAfterTimestamp({
    chatId,
    timestamp,
  }: {
    chatId: string;
    timestamp: Date;
  }) {
    const messages = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
    const messageIds = messages.map((m) => m.id);
    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));
      return db
        .delete(message)
        .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  }

  @ValidateAndLog
  async updateChatVisiblityById({
    chatId,
    visibility,
  }: {
    chatId: string;
    visibility: 'private' | 'public';
  }) {
    return db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  }
}

// Create a single instance to export
export const actions = new DbActions();

// Export individual methods for convenience
export const {
  getUser,
  createUser,
  saveChat,
  deleteChatById,
  getChatsByUserId,
  getChatById,
  saveMessages,
  getMessagesByChatId,
  voteMessage,
  getVotesByChatId,
  saveDocument,
  getDocumentsById,
  getDocumentById,
  deleteDocumentsByIdAfterTimestamp,
  saveSuggestions,
  getSuggestionsByDocumentId,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatVisiblityById,
} = actions;