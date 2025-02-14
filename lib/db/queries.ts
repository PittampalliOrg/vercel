// lib/db/queries.ts
import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

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

import { BlockKind } from '@/components/block';
import { logger } from '@/lib/logger';
import { drizzleTracer } from './drizzleTracer'; // custom tracer from your snippet or similar

// Connect Postgres
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/** getUser */
export async function getUser(email: string): Promise<Array<User>> {
  return drizzleTracer.startActiveSpan('drizzle.getUser', async (span) => {
    try {
      const result = await db.select().from(user).where(eq(user.email, email));
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });
      return result;
    } catch (error) {
      logger.error('Failed to get user from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 }); // 2=ERROR
      throw error;
    }
  });
}

/** createUser */
export async function createUser(email: string, password: string) {
  return drizzleTracer.startActiveSpan('drizzle.createUser', async (span) => {
    try {
      const salt = genSaltSync(10);
      const hash = hashSync(password, salt);
      const result = await db.insert(user).values({ email, password: hash });
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to create user in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** saveChat */
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  return drizzleTracer.startActiveSpan('drizzle.saveChat', async (span) => {
    try {
      const result = await db.insert(chat).values({
        id,
        createdAt: new Date(),
        userId,
        title,
      });
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to save chat in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** deleteChatById */
export async function deleteChatById({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.deleteChatById', async (span) => {
    try {
      await db.delete(vote).where(eq(vote.chatId, id));
      await db.delete(message).where(eq(message.chatId, id));
      const result = await db.delete(chat).where(eq(chat.id, id));
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to delete chat by id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getChatsByUserId */
export async function getChatsByUserId({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getChatsByUserId', async (span) => {
    try {
      const result = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, id))
        .orderBy(desc(chat.createdAt));
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });
      return result;
    } catch (error) {
      logger.error('Failed to get chats by user from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getChatById */
export async function getChatById({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getChatById', async (span) => {
    try {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
      span?.addEvent('Response data', {
        found: !!selectedChat,
        chat: JSON.stringify(selectedChat ?? {}),
      });
      return selectedChat;
    } catch (error) {
      logger.error('Failed to get chat by id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** saveMessages */
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  return drizzleTracer.startActiveSpan('drizzle.saveMessages', async (span) => {
    try {
      const result = await db.insert(message).values(messages);
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to save messages in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getMessagesByChatId */
export async function getMessagesByChatId({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getMessagesByChatId', async (span) => {
    try {
      const result = await db
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(asc(message.createdAt));
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });
      return result;
    } catch (error) {
      logger.error('Failed to get messages by chat id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** voteMessage */
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  return drizzleTracer.startActiveSpan('drizzle.voteMessage', async (span) => {
    try {
      // Build the SELECT
      const selectQ = db.select().from(vote).where(and(eq(vote.messageId, messageId)));
      const selectSql = selectQ.toSQL();
      span?.addEvent('Drizzle SELECT query', {
        sql: selectSql.sql,
        params: JSON.stringify(selectSql.params),
      });

      const [existingVote] = await selectQ;
      span?.addEvent('Drizzle SELECT result', {
        rowCount: existingVote ? 1 : 0,
      });

      if (existingVote) {
        const updateQ = db
          .update(vote)
          .set({ isUpvoted: type === 'up' })
          .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

        const updateSql = updateQ.toSQL();
        span?.addEvent('Drizzle UPDATE query', {
          sql: updateSql.sql,
          params: JSON.stringify(updateSql.params),
        });

        const result = await updateQ;
        span?.addEvent('Drizzle UPDATE result', {
          updatedCount: JSON.stringify(result),
        });
        span?.addEvent('Response data', {
          updatedCount: JSON.stringify(result),
        });
        return result;
      } else {
        const insertQ = db.insert(vote).values({
          chatId,
          messageId,
          isUpvoted: type === 'up',
        });

        const insertSql = insertQ.toSQL();
        span?.addEvent('Drizzle INSERT query', {
          sql: insertSql.sql,
          params: JSON.stringify(insertSql.params),
        });

        const result = await insertQ;
        span?.addEvent('Drizzle INSERT result', {
          insertResult: JSON.stringify(result),
        });
        span?.addEvent('Response data', {
          insertResult: JSON.stringify(result),
        });
        return result;
      }
    } catch (error) {
      logger.error('Failed to upvote message in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getVotesByChatId */
export async function getVotesByChatId({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getVotesByChatId', async (span) => {
    try {
      const q = db.select().from(vote).where(eq(vote.chatId, id));
      const { sql, params } = q.toSQL();
      span?.addEvent('Drizzle SELECT query', {
        sql,
        params: JSON.stringify(params),
      });

      const result = await q;
      span?.addEvent('Drizzle SELECT result', {
        rowCount: result.length,
      });
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });

      return result;
    } catch (error) {
      logger.error('Failed to get votes by chat id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** saveDocument */
export async function saveDocument({
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
  return drizzleTracer.startActiveSpan('drizzle.saveDocument', async (span) => {
    try {
      const result = await db.insert(document).values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      });
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to save document in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getDocumentsById */
export async function getDocumentsById({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getDocumentsById', async (span) => {
    try {
      const documents = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(asc(document.createdAt));
      span?.addEvent('Response data', {
        rowCount: documents.length,
        firstRow: JSON.stringify(documents[0] ?? {}),
      });
      return documents;
    } catch (error) {
      logger.error('Failed to get document by id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getDocumentById */
export async function getDocumentById({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getDocumentById', async (span) => {
    try {
      const [selectedDocument] = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(desc(document.createdAt));
      span?.addEvent('Response data', {
        found: !!selectedDocument,
        document: JSON.stringify(selectedDocument ?? {}),
      });
      return selectedDocument;
    } catch (error) {
      logger.error('Failed to get document by id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** deleteDocumentsByIdAfterTimestamp */
export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  return drizzleTracer.startActiveSpan(
    'drizzle.deleteDocumentsByIdAfterTimestamp',
    async (span) => {
      try {
        await db
          .delete(suggestion)
          .where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

        const result = await db
          .delete(document)
          .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
        span?.addEvent('Response data', {
          result: JSON.stringify(result),
        });
        return result;
      } catch (error) {
        logger.error(
          'Failed to delete documents by id after timestamp from database',
          { error }
        );
        span?.recordException(error as Error);
        span?.setStatus({ code: 2 });
        throw error;
      }
    }
  );
}

/** saveSuggestions */
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  return drizzleTracer.startActiveSpan('drizzle.saveSuggestions', async (span) => {
    try {
      const result = await db.insert(suggestion).values(suggestions);
      span?.addEvent('Response data', {
        insertCount: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to save suggestions in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getSuggestionsByDocumentId */
export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  return drizzleTracer.startActiveSpan('drizzle.getSuggestionsByDocumentId', async (span) => {
    try {
      const result = await db
        .select()
        .from(suggestion)
        .where(and(eq(suggestion.documentId, documentId)));
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });
      return result;
    } catch (error) {
      logger.error('Failed to get suggestions by document from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** getMessageById */
export async function getMessageById({ id }: { id: string }) {
  return drizzleTracer.startActiveSpan('drizzle.getMessageById', async (span) => {
    try {
      const result = await db.select().from(message).where(eq(message.id, id));
      span?.addEvent('Response data', {
        rowCount: result.length,
        firstRow: JSON.stringify(result[0] ?? {}),
      });
      return result;
    } catch (error) {
      logger.error('Failed to get message by id from database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}

/** deleteMessagesByChatIdAfterTimestamp */
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  return drizzleTracer.startActiveSpan(
    'drizzle.deleteMessagesByChatIdAfterTimestamp',
    async (span) => {
      try {
        const result = await db
          .delete(message)
          .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
        span?.addEvent('Response data', {
          result: JSON.stringify(result),
        });
        return result;
      } catch (error) {
        logger.error('Failed to delete messages by id after timestamp', { error });
        span?.recordException(error as Error);
        span?.setStatus({ code: 2 });
        throw error;
      }
    }
  );
}

/** updateChatVisiblityById */
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  return drizzleTracer.startActiveSpan('drizzle.updateChatVisiblityById', async (span) => {
    try {
      const result = await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
      span?.addEvent('Response data', {
        result: JSON.stringify(result),
      });
      return result;
    } catch (error) {
      logger.error('Failed to update chat visibility in database', { error });
      span?.recordException(error as Error);
      span?.setStatus({ code: 2 });
      throw error;
    }
  });
}
