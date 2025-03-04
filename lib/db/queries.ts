import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
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
import { ArtifactKind } from '@/components/artifact';
import typia from 'typia';

// A helper utility to decide whether to generate a schema.
function tryGenerateSchema<T>(fnName: string, generator: () => T): T | undefined {
  // Example rule: skip if the function name starts with create/save/delete/update
  // (Adjust this regex to suit your naming conventions.)
  if (/^(create|save|delete|update)_?/i.test(fnName)) {
    console.info(`Skipping schema generation for "${fnName}" (create/save/delete/update action).`);
    return undefined;
  }

  // Otherwise attempt schema generation; if it fails, skip
  try {
    return generator();
  } catch (error) {
    console.warn(`Skipping schema generation for "${fnName}" due to error:`, error);
    return undefined;
  }
}

// Type helper for extracting array element types
type ExtractArrayElementType<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

// Database client setup
// (biome-ignore lint: Forbidden non-null assertion.)
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// -----------------------------------------------------------------------
// Original functions
// -----------------------------------------------------------------------
async function _getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

async function _createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

async function _saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

async function _deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

async function _getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

async function _getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

async function _saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

async function _getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

async function _voteMessage({
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
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

async function _getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

async function _saveDocument({
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
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

async function _getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

async function _getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

async function _deleteDocumentsByIdAfterTimestamp({
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

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

async function _saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

async function _getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

async function _getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

async function _deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((m) => m.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

async function _updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

// -----------------------------------------------------------------------
// Conditionally generate Typia schemas for each function
// -----------------------------------------------------------------------
export const schemas: Record<string, any> = {};

const maybeGetUserSchema = tryGenerateSchema('_getUser', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getUser>>>], '3.1'>()
);
if (maybeGetUserSchema) schemas.getUser = maybeGetUserSchema;

const maybeCreateUserSchema = tryGenerateSchema('_createUser', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _createUser>>>], '3.1'>()
);
if (maybeCreateUserSchema) schemas.createUser = maybeCreateUserSchema;

const maybeSaveChatSchema = tryGenerateSchema('_saveChat', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _saveChat>>>], '3.1'>()
);
if (maybeSaveChatSchema) schemas.saveChat = maybeSaveChatSchema;

const maybeDeleteChatByIdSchema = tryGenerateSchema('_deleteChatById', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _deleteChatById>>>], '3.1'>()
);
if (maybeDeleteChatByIdSchema) schemas.deleteChatById = maybeDeleteChatByIdSchema;

const maybeGetChatsByUserIdSchema = tryGenerateSchema('_getChatsByUserId', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getChatsByUserId>>>], '3.1'>()
);
if (maybeGetChatsByUserIdSchema) schemas.getChatsByUserId = maybeGetChatsByUserIdSchema;

const maybeGetChatByIdSchema = tryGenerateSchema('_getChatById', () =>
  typia.json.schemas<[Awaited<ReturnType<typeof _getChatById>>], '3.1'>()
);
if (maybeGetChatByIdSchema) schemas.getChatById = maybeGetChatByIdSchema;

const maybeSaveMessagesSchema = tryGenerateSchema('_saveMessages', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _saveMessages>>>], '3.1'>()
);
if (maybeSaveMessagesSchema) schemas.saveMessages = maybeSaveMessagesSchema;

const maybeGetMessagesByChatIdSchema = tryGenerateSchema('_getMessagesByChatId', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getMessagesByChatId>>>], '3.1'>()
);
if (maybeGetMessagesByChatIdSchema) schemas.getMessagesByChatId = maybeGetMessagesByChatIdSchema;

const maybeVoteMessageSchema = tryGenerateSchema('_voteMessage', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _voteMessage>>>], '3.1'>()
);
if (maybeVoteMessageSchema) schemas.voteMessage = maybeVoteMessageSchema;

const maybeGetVotesByChatIdSchema = tryGenerateSchema('_getVotesByChatId', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getVotesByChatId>>>], '3.1'>()
);
if (maybeGetVotesByChatIdSchema) schemas.getVotesByChatId = maybeGetVotesByChatIdSchema;

const maybeSaveDocumentSchema = tryGenerateSchema('_saveDocument', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _saveDocument>>>], '3.1'>()
);
if (maybeSaveDocumentSchema) schemas.saveDocument = maybeSaveDocumentSchema;

const maybeGetDocumentsByIdSchema = tryGenerateSchema('_getDocumentsById', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getDocumentsById>>>], '3.1'>()
);
if (maybeGetDocumentsByIdSchema) schemas.getDocumentsById = maybeGetDocumentsByIdSchema;

const maybeGetDocumentByIdSchema = tryGenerateSchema('_getDocumentById', () =>
  typia.json.schemas<[Awaited<ReturnType<typeof _getDocumentById>>], '3.1'>()
);
if (maybeGetDocumentByIdSchema) schemas.getDocumentById = maybeGetDocumentByIdSchema;

const maybeDeleteDocumentsByIdAfterTimestampSchema = tryGenerateSchema('_deleteDocumentsByIdAfterTimestamp', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _deleteDocumentsByIdAfterTimestamp>>>], '3.1'>()
);
if (maybeDeleteDocumentsByIdAfterTimestampSchema) {
  schemas.deleteDocumentsByIdAfterTimestamp = maybeDeleteDocumentsByIdAfterTimestampSchema;
}

const maybeSaveSuggestionsSchema = tryGenerateSchema('_saveSuggestions', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _saveSuggestions>>>], '3.1'>()
);
if (maybeSaveSuggestionsSchema) schemas.saveSuggestions = maybeSaveSuggestionsSchema;

const maybeGetSuggestionsByDocumentIdSchema = tryGenerateSchema('_getSuggestionsByDocumentId', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getSuggestionsByDocumentId>>>], '3.1'>()
);
if (maybeGetSuggestionsByDocumentIdSchema) {
  schemas.getSuggestionsByDocumentId = maybeGetSuggestionsByDocumentIdSchema;
}

const maybeGetMessageByIdSchema = tryGenerateSchema('_getMessageById', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _getMessageById>>>], '3.1'>()
);
if (maybeGetMessageByIdSchema) schemas.getMessageById = maybeGetMessageByIdSchema;

const maybeDeleteMessagesByChatIdAfterTimestampSchema = tryGenerateSchema('_deleteMessagesByChatIdAfterTimestamp', () =>
  typia.json.schemas<[NonNullable<Awaited<ReturnType<typeof _deleteMessagesByChatIdAfterTimestamp>>>], '3.1'>()
);
if (maybeDeleteMessagesByChatIdAfterTimestampSchema) {
  schemas.deleteMessagesByChatIdAfterTimestamp = maybeDeleteMessagesByChatIdAfterTimestampSchema;
}

const maybeUpdateChatVisiblityByIdSchema = tryGenerateSchema('_updateChatVisiblityById', () =>
  typia.json.schemas<[ExtractArrayElementType<Awaited<ReturnType<typeof _updateChatVisiblityById>>>], '3.1'>()
);
if (maybeUpdateChatVisiblityByIdSchema) {
  schemas.updateChatVisiblityById = maybeUpdateChatVisiblityByIdSchema;
}

// -----------------------------------------------------------------------
// Export the functions directly, without validation wrappers
// -----------------------------------------------------------------------
export const getUser = _getUser;
export const createUser = _createUser;
export const saveChat = _saveChat;
export const deleteChatById = _deleteChatById;
export const getChatsByUserId = _getChatsByUserId;
export const getChatById = _getChatById;
export const saveMessages = _saveMessages;
export const getMessagesByChatId = _getMessagesByChatId;
export const voteMessage = _voteMessage;
export const getVotesByChatId = _getVotesByChatId;
export const saveDocument = _saveDocument;
export const getDocumentsById = _getDocumentsById;
export const getDocumentById = _getDocumentById;
export const deleteDocumentsByIdAfterTimestamp = _deleteDocumentsByIdAfterTimestamp;
export const saveSuggestions = _saveSuggestions;
export const getSuggestionsByDocumentId = _getSuggestionsByDocumentId;
export const getMessageById = _getMessageById;
export const deleteMessagesByChatIdAfterTimestamp = _deleteMessagesByChatIdAfterTimestamp;
export const updateChatVisiblityById = _updateChatVisiblityById;

// Finally, export `schemas` so you can reference any that were successfully generated.
