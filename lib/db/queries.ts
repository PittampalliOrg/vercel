// lib/db/queries.ts
import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import typia from 'typia';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

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
type MethodParams<T extends (...args: any) => any> = Parameters<T>;
type MethodReturn<T extends (...args: any) => any> = Awaited<ReturnType<T>>;

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

    // Retrieve paramSchema & returnSchema from below 'schemas' object
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
 * We'll fill in 'schemas' for each method below (no loops),
 * ensuring the type inference is stable for Typia.
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

// Create a single instance of the DbActions class
const actions = new DbActions();

/**
 * We'll store param/return schemas for each method individually, logging them as we go.
 * This ensures each method's type inference is stable, and we can confirm Typia is generating them.
 */
export const schemas: Record<
  keyof DbActions,
  { paramSchema?: unknown; returnSchema?: unknown }
> = {} as any;

// For logging success/failure
const succeeded: (keyof DbActions)[] = [];
const failed: (keyof DbActions)[] = [];

// A small helper for prettified JSON output
function logSchema(title: string, schema: unknown) {
  console.log(`[Typia]   ${title}`);
  console.dir(schema, { depth: Infinity, colors: true });
}

// --- Generate each method's schemas individually. No loops. ---
console.log('\n[Typia] Generating schemas for each method (no loops)...');

// 1) getUser
console.log('[Typia]   Generating schemas for "getUser"');
try {
  type P = MethodParams<DbActions['getUser']>;
  type R = MethodReturn<DbActions['getUser']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getUser = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getUser success');
  logSchema('Param schema (getUser)', paramSchema);
  logSchema('Return schema (getUser)', returnSchema);

  succeeded.push('getUser');
} catch (error) {
  console.error('[Typia]     ❌ getUser failed:', error);
  failed.push('getUser');
}

// 2) createUser
console.log('[Typia]   Generating schemas for "createUser"');
try {
  type P = MethodParams<DbActions['createUser']>;
  type R = MethodReturn<DbActions['createUser']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.createUser = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ createUser success');
  logSchema('Param schema (createUser)', paramSchema);
  logSchema('Return schema (createUser)', returnSchema);

  succeeded.push('createUser');
} catch (error) {
  console.error('[Typia]     ❌ createUser failed:', error);
  failed.push('createUser');
}

// 3) saveChat
console.log('[Typia]   Generating schemas for "saveChat"');
try {
  type P = MethodParams<DbActions['saveChat']>;
  type R = MethodReturn<DbActions['saveChat']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.saveChat = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ saveChat success');
  logSchema('Param schema (saveChat)', paramSchema);
  logSchema('Return schema (saveChat)', returnSchema);

  succeeded.push('saveChat');
} catch (error) {
  console.error('[Typia]     ❌ saveChat failed:', error);
  failed.push('saveChat');
}

// 4) deleteChatById
console.log('[Typia]   Generating schemas for "deleteChatById"');
try {
  type P = MethodParams<DbActions['deleteChatById']>;
  type R = MethodReturn<DbActions['deleteChatById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.deleteChatById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ deleteChatById success');
  logSchema('Param schema (deleteChatById)', paramSchema);
  logSchema('Return schema (deleteChatById)', returnSchema);

  succeeded.push('deleteChatById');
} catch (error) {
  console.error('[Typia]     ❌ deleteChatById failed:', error);
  failed.push('deleteChatById');
}

// 5) getChatsByUserId
console.log('[Typia]   Generating schemas for "getChatsByUserId"');
try {
  type P = MethodParams<DbActions['getChatsByUserId']>;
  type R = MethodReturn<DbActions['getChatsByUserId']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getChatsByUserId = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getChatsByUserId success');
  logSchema('Param schema (getChatsByUserId)', paramSchema);
  logSchema('Return schema (getChatsByUserId)', returnSchema);

  succeeded.push('getChatsByUserId');
} catch (error) {
  console.error('[Typia]     ❌ getChatsByUserId failed:', error);
  failed.push('getChatsByUserId');
}

// 6) getChatById
console.log('[Typia]   Generating schemas for "getChatById"');
try {
  type P = MethodParams<DbActions['getChatById']>;
  type R = MethodReturn<DbActions['getChatById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getChatById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getChatById success');
  logSchema('Param schema (getChatById)', paramSchema);
  logSchema('Return schema (getChatById)', returnSchema);

  succeeded.push('getChatById');
} catch (error) {
  console.error('[Typia]     ❌ getChatById failed:', error);
  failed.push('getChatById');
}

// 7) saveMessages
console.log('[Typia]   Generating schemas for "saveMessages"');
try {
  type P = MethodParams<DbActions['saveMessages']>;
  type R = MethodReturn<DbActions['saveMessages']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.saveMessages = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ saveMessages success');
  logSchema('Param schema (saveMessages)', paramSchema);
  logSchema('Return schema (saveMessages)', returnSchema);

  succeeded.push('saveMessages');
} catch (error) {
  console.error('[Typia]     ❌ saveMessages failed:', error);
  failed.push('saveMessages');
}

// 8) getMessagesByChatId
console.log('[Typia]   Generating schemas for "getMessagesByChatId"');
try {
  type P = MethodParams<DbActions['getMessagesByChatId']>;
  type R = MethodReturn<DbActions['getMessagesByChatId']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getMessagesByChatId = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getMessagesByChatId success');
  logSchema('Param schema (getMessagesByChatId)', paramSchema);
  logSchema('Return schema (getMessagesByChatId)', returnSchema);

  succeeded.push('getMessagesByChatId');
} catch (error) {
  console.error('[Typia]     ❌ getMessagesByChatId failed:', error);
  failed.push('getMessagesByChatId');
}

// 9) voteMessage
console.log('[Typia]   Generating schemas for "voteMessage"');
try {
  type P = MethodParams<DbActions['voteMessage']>;
  type R = MethodReturn<DbActions['voteMessage']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.voteMessage = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ voteMessage success');
  logSchema('Param schema (voteMessage)', paramSchema);
  logSchema('Return schema (voteMessage)', returnSchema);

  succeeded.push('voteMessage');
} catch (error) {
  console.error('[Typia]     ❌ voteMessage failed:', error);
  failed.push('voteMessage');
}

// 10) getVotesByChatId
console.log('[Typia]   Generating schemas for "getVotesByChatId"');
try {
  type P = MethodParams<DbActions['getVotesByChatId']>;
  type R = MethodReturn<DbActions['getVotesByChatId']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getVotesByChatId = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getVotesByChatId success');
  logSchema('Param schema (getVotesByChatId)', paramSchema);
  logSchema('Return schema (getVotesByChatId)', returnSchema);

  succeeded.push('getVotesByChatId');
} catch (error) {
  console.error('[Typia]     ❌ getVotesByChatId failed:', error);
  failed.push('getVotesByChatId');
}

// 11) saveDocument
console.log('[Typia]   Generating schemas for "saveDocument"');
try {
  type P = MethodParams<DbActions['saveDocument']>;
  type R = MethodReturn<DbActions['saveDocument']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.saveDocument = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ saveDocument success');
  logSchema('Param schema (saveDocument)', paramSchema);
  logSchema('Return schema (saveDocument)', returnSchema);

  succeeded.push('saveDocument');
} catch (error) {
  console.error('[Typia]     ❌ saveDocument failed:', error);
  failed.push('saveDocument');
}

// 12) getDocumentsById
console.log('[Typia]   Generating schemas for "getDocumentsById"');
try {
  type P = MethodParams<DbActions['getDocumentsById']>;
  type R = MethodReturn<DbActions['getDocumentsById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getDocumentsById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getDocumentsById success');
  logSchema('Param schema (getDocumentsById)', paramSchema);
  logSchema('Return schema (getDocumentsById)', returnSchema);

  succeeded.push('getDocumentsById');
} catch (error) {
  console.error('[Typia]     ❌ getDocumentsById failed:', error);
  failed.push('getDocumentsById');
}

// 13) getDocumentById
console.log('[Typia]   Generating schemas for "getDocumentById"');
try {
  type P = MethodParams<DbActions['getDocumentById']>;
  type R = MethodReturn<DbActions['getDocumentById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getDocumentById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getDocumentById success');
  logSchema('Param schema (getDocumentById)', paramSchema);
  logSchema('Return schema (getDocumentById)', returnSchema);

  succeeded.push('getDocumentById');
} catch (error) {
  console.error('[Typia]     ❌ getDocumentById failed:', error);
  failed.push('getDocumentById');
}

// 14) deleteDocumentsByIdAfterTimestamp
console.log('[Typia]   Generating schemas for "deleteDocumentsByIdAfterTimestamp"');
try {
  type P = MethodParams<DbActions['deleteDocumentsByIdAfterTimestamp']>;
  type R = MethodReturn<DbActions['deleteDocumentsByIdAfterTimestamp']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.deleteDocumentsByIdAfterTimestamp = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ deleteDocumentsByIdAfterTimestamp success');
  logSchema('Param schema (deleteDocumentsByIdAfterTimestamp)', paramSchema);
  logSchema('Return schema (deleteDocumentsByIdAfterTimestamp)', returnSchema);

  succeeded.push('deleteDocumentsByIdAfterTimestamp');
} catch (error) {
  console.error('[Typia]     ❌ deleteDocumentsByIdAfterTimestamp failed:', error);
  failed.push('deleteDocumentsByIdAfterTimestamp');
}

// 15) saveSuggestions
console.log('[Typia]   Generating schemas for "saveSuggestions"');
try {
  type P = MethodParams<DbActions['saveSuggestions']>;
  type R = MethodReturn<DbActions['saveSuggestions']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.saveSuggestions = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ saveSuggestions success');
  logSchema('Param schema (saveSuggestions)', paramSchema);
  logSchema('Return schema (saveSuggestions)', returnSchema);

  succeeded.push('saveSuggestions');
} catch (error) {
  console.error('[Typia]     ❌ saveSuggestions failed:', error);
  failed.push('saveSuggestions');
}

// 16) getSuggestionsByDocumentId
console.log('[Typia]   Generating schemas for "getSuggestionsByDocumentId"');
try {
  type P = MethodParams<DbActions['getSuggestionsByDocumentId']>;
  type R = MethodReturn<DbActions['getSuggestionsByDocumentId']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getSuggestionsByDocumentId = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getSuggestionsByDocumentId success');
  logSchema('Param schema (getSuggestionsByDocumentId)', paramSchema);
  logSchema('Return schema (getSuggestionsByDocumentId)', returnSchema);

  succeeded.push('getSuggestionsByDocumentId');
} catch (error) {
  console.error('[Typia]     ❌ getSuggestionsByDocumentId failed:', error);
  failed.push('getSuggestionsByDocumentId');
}

// 17) getMessageById
console.log('[Typia]   Generating schemas for "getMessageById"');
try {
  type P = MethodParams<DbActions['getMessageById']>;
  type R = MethodReturn<DbActions['getMessageById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.getMessageById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ getMessageById success');
  logSchema('Param schema (getMessageById)', paramSchema);
  logSchema('Return schema (getMessageById)', returnSchema);

  succeeded.push('getMessageById');
} catch (error) {
  console.error('[Typia]     ❌ getMessageById failed:', error);
  failed.push('getMessageById');
}

// 18) deleteMessagesByChatIdAfterTimestamp
console.log('[Typia]   Generating schemas for "deleteMessagesByChatIdAfterTimestamp"');
try {
  type P = MethodParams<DbActions['deleteMessagesByChatIdAfterTimestamp']>;
  type R = MethodReturn<DbActions['deleteMessagesByChatIdAfterTimestamp']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.deleteMessagesByChatIdAfterTimestamp = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ deleteMessagesByChatIdAfterTimestamp success');
  logSchema('Param schema (deleteMessagesByChatIdAfterTimestamp)', paramSchema);
  logSchema('Return schema (deleteMessagesByChatIdAfterTimestamp)', returnSchema);

  succeeded.push('deleteMessagesByChatIdAfterTimestamp');
} catch (error) {
  console.error('[Typia]     ❌ deleteMessagesByChatIdAfterTimestamp failed:', error);
  failed.push('deleteMessagesByChatIdAfterTimestamp');
}

// 19) updateChatVisiblityById
console.log('[Typia]   Generating schemas for "updateChatVisiblityById"');
try {
  type P = MethodParams<DbActions['updateChatVisiblityById']>;
  type R = MethodReturn<DbActions['updateChatVisiblityById']>;

  const paramSchema = typia.json.schemas<[P], '3.1'>();
  const returnSchema = typia.json.schemas<[R], '3.1'>();

  schemas.updateChatVisiblityById = { paramSchema, returnSchema };

  console.log('[Typia]     ✅ updateChatVisiblityById success');
  logSchema('Param schema (updateChatVisiblityById)', paramSchema);
  logSchema('Return schema (updateChatVisiblityById)', returnSchema);

  succeeded.push('updateChatVisiblityById');
} catch (error) {
  console.error('[Typia]     ❌ updateChatVisiblityById failed:', error);
  failed.push('updateChatVisiblityById');
}

/** Final summary log */
console.log('\n[Typia] Schema Generation Summary (no loops):');
console.log(`  Succeeded (${succeeded.length}): ${succeeded.join(', ') || 'none'}`);
console.log(`  Failed (${failed.length}): ${failed.join(', ') || 'none'}\n`);

/** Export the instance's methods (for direct usage) */
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
