import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

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

import { context, trace } from '@opentelemetry/api'; // <-- OTel APIs
import bunyan from 'bunyan';                        // <-- Bunyan logger

const log = bunyan.createLogger({ name: 'myapp', level: 'debug' });

// Establish Postgres client + Drizzle
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Helper to attach OTel trace info to logs:
function getTraceContext() {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }
  return {
    traceId: span.spanContext().traceId,
    spanId: span.spanContext().spanId,
  };
}

// 1) GET USER
export async function getUser(email: string): Promise<Array<User>> {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, email }, 'Invoking getUser');

  try {
    const result = await db.select().from(user).where(eq(user.email, email));
    log.info({ ...otelCtx, email }, 'Successfully got user');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, email }, 'Failed to get user from database');
    throw error;
  }
}

// 2) CREATE USER
export async function createUser(email: string, password: string) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, email }, 'Invoking createUser');

  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const result = await db.insert(user).values({ email, password: hash });
    log.info({ ...otelCtx, email }, 'Successfully created user');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, email }, 'Failed to create user in database');
    throw error;
  }
}

// 3) SAVE CHAT
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id, userId, title }, 'Invoking saveChat');

  try {
    const result = await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
    log.info({ ...otelCtx, id, userId }, 'Successfully saved chat');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id, userId }, 'Failed to save chat in database');
    throw error;
  }
}

// 4) DELETE CHAT BY ID
export async function deleteChatById({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking deleteChatById');

  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    const result = await db.delete(chat).where(eq(chat.id, id));

    log.info({ ...otelCtx, id }, 'Successfully deleted chat by id');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to delete chat by id from database');
    throw error;
  }
}

// 5) GET CHATS BY USER ID
export async function getChatsByUserId({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getChatsByUserId');

  try {
    const results = await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));

    log.info({ ...otelCtx, count: results.length }, 'Successfully got chats by user');
    return results;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get chats by user from database');
    throw error;
  }
}

// 6) GET CHAT BY ID
export async function getChatById({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getChatById');

  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    log.info({ ...otelCtx, id }, 'Successfully got chat by id');
    return selectedChat;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get chat by id from database');
    throw error;
  }
}

// 7) SAVE MESSAGES
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, count: messages.length }, 'Invoking saveMessages');

  try {
    const result = await db.insert(message).values(messages);
    log.info({ ...otelCtx }, 'Successfully saved messages');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error }, 'Failed to save messages in database');
    throw error;
  }
}

// 8) GET MESSAGES BY CHAT ID
export async function getMessagesByChatId({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getMessagesByChatId');

  try {
    const results = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));

    log.info({ ...otelCtx, id, count: results.length }, 'Successfully got messages by chat');
    return results;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get messages by chat id');
    throw error;
  }
}

// 9) VOTE MESSAGE
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, chatId, messageId, type }, 'Invoking voteMessage');

  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      const result = await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
      log.info({ ...otelCtx, chatId, messageId }, 'Updated existing vote');
      return result;
    }

    const result = await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
    log.info({ ...otelCtx, chatId, messageId }, 'Inserted new vote');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, chatId, messageId }, 'Failed to upvote message');
    throw error;
  }
}

// 10) GET VOTES BY CHAT ID
export async function getVotesByChatId({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getVotesByChatId');

  try {
    const results = await db.select().from(vote).where(eq(vote.chatId, id));
    log.info({ ...otelCtx, id, count: results.length }, 'Successfully got votes by chat');
    return results;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get votes by chat id');
    throw error;
  }
}

// 11) SAVE DOCUMENT
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: string; // or your BlockKind
  content: string;
  userId: string;
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id, userId, title }, 'Invoking saveDocument');

  try {
    const result = await db.insert(document).values({
      title,
      kind,
      content,
      userId
    })
    log.info({ ...otelCtx, id, userId }, 'Successfully saved document');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id, userId }, 'Failed to save document');
    throw error;
  }
}

// 12) GET DOCUMENTS BY ID
export async function getDocumentsById({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getDocumentsById');

  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    log.info({ ...otelCtx, id, count: documents.length }, 'Successfully got documents by id');
    return documents;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get documents by id');
    throw error;
  }
}

// 13) GET DOCUMENT BY ID
export async function getDocumentById({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getDocumentById');

  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    log.info({ ...otelCtx, id }, 'Successfully got document by id');
    return selectedDocument;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get document by id');
    throw error;
  }
}

// 14) DELETE DOCUMENTS BY ID AFTER TIMESTAMP
export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id, timestamp }, 'Invoking deleteDocumentsByIdAfterTimestamp');

  try {
    await db
      .delete(suggestion)
      .where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

    const result = await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));

    log.info({ ...otelCtx, id, timestamp }, 'Successfully deleted documents after timestamp');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id, timestamp }, 'Failed to delete documents after timestamp');
    throw error;
  }
}

// 15) SAVE SUGGESTIONS
export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, count: suggestions.length }, 'Invoking saveSuggestions');

  try {
    const result = await db.insert(suggestion).values(suggestions);
    log.info({ ...otelCtx }, 'Successfully saved suggestions');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error }, 'Failed to save suggestions');
    throw error;
  }
}

// 16) GET SUGGESTIONS BY DOCUMENT ID
export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, documentId }, 'Invoking getSuggestionsByDocumentId');

  try {
    const results = await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));

    log.info({ ...otelCtx, documentId, count: results.length }, 'Successfully got suggestions');
    return results;
  } catch (error) {
    log.error({ ...otelCtx, err: error, documentId }, 'Failed to get suggestions by document');
    throw error;
  }
}

// 17) GET MESSAGE BY ID
export async function getMessageById({ id }: { id: string }) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, id }, 'Invoking getMessageById');

  try {
    const result = await db.select().from(message).where(eq(message.id, id));
    log.info({ ...otelCtx, id }, 'Successfully got message by id');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, id }, 'Failed to get message by id');
    throw error;
  }
}

// 18) DELETE MESSAGES BY CHAT ID AFTER TIMESTAMP
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, chatId, timestamp }, 'Invoking deleteMessagesByChatIdAfterTimestamp');

  try {
    const result = await db
      .delete(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

    log.info({ ...otelCtx, chatId, timestamp }, 'Successfully deleted messages after timestamp');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, chatId, timestamp }, 'Failed to delete messages after timestamp');
    throw error;
  }
}

// 19) UPDATE CHAT VISIBILITY
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  const otelCtx = getTraceContext();
  log.info({ ...otelCtx, chatId, visibility }, 'Invoking updateChatVisiblityById');

  try {
    const result = await db
      .update(chat)
      .set({ visibility })
      .where(eq(chat.id, chatId));

    log.info({ ...otelCtx, chatId, visibility }, 'Successfully updated chat visibility');
    return result;
  } catch (error) {
    log.error({ ...otelCtx, err: error, chatId, visibility }, 'Failed to update chat visibility');
    throw error;
  }
}
