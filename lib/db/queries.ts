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
  message,
  vote,
} from './schema';
import { BlockKind } from '@/components/block';
import { createNewDabClient } from '../createDabClient';
import { DaprClient } from '@dapr/dapr';

// import {
//   User, Suggestion, Message, Vote
//   } from '../../clients/generated-clients/client/models';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const dabClient = createNewDabClient();

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const data = await dabClient.user.get({queryParameters: {filter: `email eq ${email}`}});
    return data?.value ?? [];
    // return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await dabClient.user.post({email, password: hash});
  //  return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await dabClient.chat.post({
      id,
      userId,
      createdAt: new Date().toJSON(),
      title
    })
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const messages = await dabClient.message.get({queryParameters: {filter: `chatId eq ${id}`}});
    const votes = await dabClient.vote.get({queryParameters: {filter: `chatId eq ${id}`}});
    if (messages?.value) {
      await Promise.all(messages.value.map(message => dabClient.message.id.byId(message.id!).delete()));
    }
    if (votes?.value) {
      await Promise.all(votes.value.map(vote => {
        if (vote.chatId && vote.messageId) {
          return dabClient.vote.chatId.byChatId(vote.chatId).messageId.byMessageId(vote.messageId).delete();
        }
      }));
    }
    // await db.delete(vote).where(eq(vote.chatId, id));
    // await db.delete(message).where(eq(message.chatId, id));
    return await dabClient.chat.id.byId(id).delete();
  //  return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    const data = await dabClient.chat.get({queryParameters: {filter: `userId eq ${id}`, orderby: 'createdAt desc'}});
    return data?.value
    // return await db
    //   .select()
    //   .from(chat)
    //   .where(eq(chat.userId, id))
    //   .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const data = await dabClient.chat.id.byId(id).get();
    const [selectedChat] = data?.value ?? [];
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

type Message = {
  id: string;
  chatId: string;
  createdAt: Date;
  role: string;
  content: unknown;
};

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}




export async function getMessagesByChatId({ id }: { id: string }) {
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

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const data = await dabClient.vote.get({queryParameters: {filter: `messageId eq ${messageId}`}});
    const [existingVote] = data?.value ?? [];
    // const [existingVote] = await db
    //   .select()
    //   .from(vote)
    //   .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      if (existingVote.chatId && existingVote.messageId) {
        return await dabClient.vote.chatId.byChatId(existingVote.chatId).messageId.byMessageId(existingVote.messageId).patch({isUpvoted: type === 'up'});
      }
      throw new Error('Invalid vote data');
      // return await db
      //   .update(vote)
      //   .set({ isUpvoted: type === 'up' })
      //   .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
      return await dabClient.vote.post({chatId, messageId, isUpvoted: type === 'up'});
    // return await db.insert(vote).values({
    //   chatId,
    //   messageId,
    //   isUpvoted: type === 'up',
    // });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const data = await dabClient.vote.get({queryParameters: {filter: `chatId eq ${id}`}});
    return data?.value
    //  return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

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
  try {
    return await dabClient.document.post({
      id,
      title,
      content,
      userId,
      createdAt: new Date().toJSON(),
    });
    // return await db.insert(document).values({
    //   id,
    //   title,
    //   kind,
    //   content,
    //   userId,
    //   createdAt: new Date(),
    // });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await dabClient.document.get({queryParameters: {filter: `id eq ${id}`, orderby: 'createdAt asc'}});
    // const documents = await db
    //   .select()
    //   .from(document)
    //   .where(eq(document.id, id))
    //   .orderBy(asc(document.createdAt));

    return documents?.value;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id , createdAt }: { id: string, createdAt: string }) {
  try {
    const data = await dabClient.document.id.byId(id).createdAt.byCreatedAt(createdAt).get();
    const [selectedDocument] = data?.value ?? [];
    // const [selectedDocument] = await db
    //   .select()
    //   .from(document)
    //   .where(eq(document.id, id))
    //   .orderBy(desc(document.createdAt));
;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const suggestions = await dabClient.suggestion.get({queryParameters: {filter: `documentId eq ${id} and createdAt gt ${timestamp.toJSON()}`}});
    // await db
    //   .delete(suggestion)
    //   .where(
    //     and(
    //       eq(suggestion.documentId, id),
    //       gt(suggestion.documentCreatedAt, timestamp),
    //     ),
    //   );
    if (suggestions?.value) {
      await Promise.all(suggestions.value.map(suggestion => dabClient.suggestion.id.byId(suggestion.id!).delete()));
    }
    // return await db
    //   .delete(document)
    //   .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    await Promise.all(suggestions.map(suggestion => dabClient.suggestion.post(suggestion)));
  //  return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const data = await dabClient.suggestion.get({queryParameters: {filter: `documentId eq ${documentId}`}});
    return data?.value ?? [];
    // return await db
    //   .select()
    //   .from(suggestion)
    //   .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const data = await dabClient.message.id.byId(id).get();
    return data?.value;
    // return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messages = await dabClient.message.get({queryParameters: {filter: `chatId eq ${chatId} and createdAt gt ${timestamp.toJSON()}`}});
    if (messages?.value) {
      await Promise.all(messages.value.map(message => dabClient.message.id.byId(message.id!).delete()));
    }
    // return await db
    //   .delete(message)
    //   .where(
    //     and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
    //   );
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await dabClient.chat.id.byId(chatId).patch({visibility});
    // return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}
