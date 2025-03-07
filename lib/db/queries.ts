// lib/db/queries.ts
import "server-only"

import { genSaltSync, hashSync } from "bcrypt-ts"
import { and, asc, desc, eq, gt, gte, inArray } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { user, chat, type User, document, type Suggestion, suggestion, type Message, message, vote } from "./schema"

import type { ArtifactKind } from "@/components/artifact"
import { ValidateAndLog } from "@/lib/generated/schema-validators-DbActions"

// Define a type that ensures kind is one of the valid document kind values
type DocumentKind = "text" | "code" | "image" | "sheet"

// Type guard to ensure ArtifactKind is a valid DocumentKind
function isValidDocumentKind(kind: ArtifactKind): kind is DocumentKind {
  return ["text", "code", "image", "sheet"].includes(kind)
}

const client = postgres(process.env.POSTGRES_URL!)
const db = drizzle(client)

/**
 * The DbActions class, each method decorated by @ValidateAndLog.
 */
export class DbActions {
  @ValidateAndLog
  async getUser(email: string): Promise<Array<User>> {
    try {
      return await db.select().from(user).where(eq(user.email, email))
    } catch (error) {
      console.error("Failed to get user from database")
      throw error
    }
  }

  @ValidateAndLog
  async createUser(email: string, password: string) {
    const salt = genSaltSync(10)
    const hash = hashSync(password, salt)

    try {
      return await db.insert(user).values({ email, password: hash })
    } catch (error) {
      console.error("Failed to create user in database")
      throw error
    }
  }

  @ValidateAndLog
  async saveChat({
    id,
    userId,
    title,
  }: {
    id: string
    userId: string
    title: string
  }) {
    try {
      return await db.insert(chat).values({
        id,
        createdAt: new Date(),
        userId,
        title,
      })
    } catch (error) {
      console.error("Failed to save chat in database")
      throw error
    }
  }

  @ValidateAndLog
  async deleteChatById({ id }: { id: string }) {
    try {
      await db.delete(vote).where(eq(vote.chatId, id))
      await db.delete(message).where(eq(message.chatId, id))

      return await db.delete(chat).where(eq(chat.id, id))
    } catch (error) {
      console.error("Failed to delete chat by id from database")
      throw error
    }
  }

  @ValidateAndLog
  async getChatsByUserId({ id }: { id: string }) {
    try {
      return await db.select().from(chat).where(eq(chat.userId, id)).orderBy(desc(chat.createdAt))
    } catch (error) {
      console.error("Failed to get chats by user from database")
      throw error
    }
  }

  @ValidateAndLog
  async getChatById({ id }: { id: string }) {
    try {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id))
      return selectedChat
    } catch (error) {
      console.error("Failed to get chat by id from database")
      throw error
    }
  }

  @ValidateAndLog
  async saveMessages({ messages }: { messages: Array<Message> }) {
    try {
      return await db.insert(message).values(messages)
    } catch (error) {
      console.error("Failed to save messages in database", error)
      throw error
    }
  }

  @ValidateAndLog
  async getMessagesByChatId({ id }: { id: string }) {
    try {
      return await db.select().from(message).where(eq(message.chatId, id)).orderBy(asc(message.createdAt))
    } catch (error) {
      console.error("Failed to get messages by chat id from database", error)
      throw error
    }
  }

  @ValidateAndLog
  async voteMessage({
    chatId,
    messageId,
    type,
  }: {
    chatId: string
    messageId: string
    type: "up" | "down"
  }) {
    try {
      const [existingVote] = await db
        .select()
        .from(vote)
        .where(and(eq(vote.messageId, messageId)))

      if (existingVote) {
        return await db
          .update(vote)
          .set({ isUpvoted: type === "up" })
          .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
      }
      return await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted: type === "up",
      })
    } catch (error) {
      console.error("Failed to upvote message in database", error)
      throw error
    }
  }

  @ValidateAndLog
  async getVotesByChatId({ id }: { id: string }) {
    try {
      return await db.select().from(vote).where(eq(vote.chatId, id))
    } catch (error) {
      console.error("Failed to get votes by chat id from database", error)
      throw error
    }
  }

  @ValidateAndLog
  async saveDocument({
    id,
    title,
    kind,
    content,
    userId,
  }: {
    id: string
    title: string
    kind: ArtifactKind
    content: string
    userId: string
  }) {
    try {
      // Validate that the kind is one of the allowed values
      if (!isValidDocumentKind(kind)) {
        throw new Error(`Invalid document kind: ${kind}`)
      }

      return await db.insert(document).values({
        id,
        title,
        kind, // Now TypeScript knows this is a valid DocumentKind
        content,
        userId,
        createdAt: new Date(),
      })
    } catch (error) {
      console.error("Failed to save document in database")
      throw error
    }
  }

  @ValidateAndLog
  async getDocumentsById({ id }: { id: string }) {
    try {
      const documents = await db.select().from(document).where(eq(document.id, id)).orderBy(asc(document.createdAt))

      return documents
    } catch (error) {
      console.error("Failed to get document by id from database")
      throw error
    }
  }

  @ValidateAndLog
  async getDocumentById({ id }: { id: string }) {
    try {
      const [selectedDocument] = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(desc(document.createdAt))

      return selectedDocument
    } catch (error) {
      console.error("Failed to get document by id from database")
      throw error
    }
  }

  @ValidateAndLog
  async deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp,
  }: {
    id: string
    timestamp: Date
  }) {
    try {
      await db.delete(suggestion).where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)))

      return await db.delete(document).where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
    } catch (error) {
      console.error("Failed to delete documents by id after timestamp from database")
      throw error
    }
  }

  @ValidateAndLog
  async saveSuggestions({
    suggestions,
  }: {
    suggestions: Array<Suggestion>
  }) {
    try {
      return await db.insert(suggestion).values(suggestions)
    } catch (error) {
      console.error("Failed to save suggestions in database")
      throw error
    }
  }

  @ValidateAndLog
  async getSuggestionsByDocumentId({
    documentId,
  }: {
    documentId: string
  }) {
    try {
      return await db
        .select()
        .from(suggestion)
        .where(and(eq(suggestion.documentId, documentId)))
    } catch (error) {
      console.error("Failed to get suggestions by document version from database")
      throw error
    }
  }

  @ValidateAndLog
  async getMessageById({ id }: { id: string }) {
    try {
      return await db.select().from(message).where(eq(message.id, id))
    } catch (error) {
      console.error("Failed to get message by id from database")
      throw error
    }
  }

  @ValidateAndLog
  async deleteMessagesByChatIdAfterTimestamp({
    chatId,
    timestamp,
  }: {
    chatId: string
    timestamp: Date
  }) {
    try {
      const messagesToDelete = await db
        .select({ id: message.id })
        .from(message)
        .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)))

      const messageIds = messagesToDelete.map((message) => message.id)

      if (messageIds.length > 0) {
        await db.delete(vote).where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)))

        return await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)))
      }
    } catch (error) {
      console.error("Failed to delete messages by id after timestamp from database")
      throw error
    }
  }

  @ValidateAndLog
  async updateChatVisiblityById({
    chatId,
    visibility,
  }: {
    chatId: string
    visibility: "private" | "public"
  }) {
    try {
      return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId))
    } catch (error) {
      console.error("Failed to update chat visibility in database")
      throw error
    }
  }
}

// Create a single instance to export
export const actions = new DbActions()

// individual methods for convenience
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
} = actions

