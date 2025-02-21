import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { TraceFunction } from '../tracer';

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

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Class to hold the database operations
class DbActions {

  @TraceFunction
  async getUser(email: string): Promise<Array<User>> {
    try {
      return await db.select().from(user).where(eq(user.email, email));
    } catch (error) {
      console.error('Failed to get user from database');
      throw error;
    }
  }

  @TraceFunction
  async createUser(email: string, password: string) {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);

    try {
      return await db.insert(user).values({ email, password: hash });
    } catch (error) {
      console.error('Failed to create user in database');
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

  @TraceFunction
  async deleteChatById({ id }: { id: string }) {
    try {
      await db.delete(vote).where(eq(vote.chatId, id));
      await db.delete(message).where(eq(message.chatId, id));
      return await db.delete(chat).where(eq(chat.id, id));
    } catch (error) {
      console.error('Failed to delete chat by id from database');
      throw error;
    }
  }

  @TraceFunction
  async getChatsByUserId({ id }: { id: string }) {
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

  @TraceFunction
  async getChatById({ id }: { id: string }) {
    try {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
      return selectedChat;
    } catch (error) {
      console.error('Failed to get chat by id from database');
      throw error;
    }
  }

  @TraceFunction
  async saveMessages({ messages }: { messages: Array<Message> }) {
    try {
      return await db.insert(message).values(messages);
    } catch (error) {
      console.error('Failed to save messages in database', error);
      throw error;
    }
  }

  @TraceFunction
  async getMessagesByChatId({ id }: { id: string }) {
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

  @TraceFunction
  async getVotesByChatId({ id }: { id: string }) {
    try {
      return await db.select().from(vote).where(eq(vote.chatId, id));
    } catch (error) {
      console.error('Failed to get votes by chat id from database', error);
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

  @TraceFunction
  async getDocumentsById({ id }: { id: string }) {
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

  @TraceFunction
  async getDocumentById({ id }: { id: string }) {
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
            gt(suggestion.documentCreatedAt, timestamp)
          )
        );

      return await db
        .delete(document)
        .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
    } catch (error) {
      console.error(
        'Failed to delete documents by id after timestamp from database'
      );
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
      return await db.insert(suggestion).values(suggestions);
    } catch (error) {
      console.error('Failed to save suggestions in database');
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
      return await db
        .select()
        .from(suggestion)
        .where(and(eq(suggestion.documentId, documentId)));
    } catch (error) {
      console.error(
        'Failed to get suggestions by document version from database'
      );
      throw error;
    }
  }

  @TraceFunction
  async getMessageById({ id }: { id: string }) {
    try {
      return await db.select().from(message).where(eq(message.id, id));
    } catch (error) {
      console.error('Failed to get message by id from database');
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
      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
        );
    } catch (error) {
      console.error(
        'Failed to delete messages by id after timestamp from database'
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
      return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
    } catch (error) {
      console.error('Failed to update chat visibility in database');
      throw error;
    }
  }
}

// Export the DbActions instance
export const dbActions = new DbActions();
