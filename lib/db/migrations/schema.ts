import { pgTable, uuid, varchar, foreignKey, timestamp, text, json, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const user = pgTable("user", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 64 }),
});

export const chat = pgTable("chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	title: text().notNull(),
	userId: uuid("user_id").notNull(),
	visibility: varchar().default('private').notNull(),
}, (table) => {
	return {
		chatUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "chat_user_id_user_id_fk"
		}),
	}
});

export const message = pgTable("message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid("chat_id").notNull(),
	role: varchar().notNull(),
	content: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => {
	return {
		messageChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "message_chat_id_chat_id_fk"
		}),
	}
});

export const suggestion = pgTable("suggestion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	documentCreatedAt: timestamp("document_created_at", { mode: 'string' }).notNull(),
	originalText: text("original_text").notNull(),
	suggestedText: text("suggested_text").notNull(),
	description: text(),
	isResolved: boolean("is_resolved").default(false).notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
}, (table) => {
	return {
		suggestionUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "suggestion_user_id_user_id_fk"
		}),
		suggestionDocumentIdDocumentCreatedAtDocumentIdCreated: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
			name: "suggestion_document_id_document_created_at_document_id_created_"
		}),
	}
});

export const vote = pgTable("vote", {
	chatId: uuid("chat_id").notNull(),
	messageId: uuid("message_id").notNull(),
	isUpvoted: boolean("is_upvoted").notNull(),
}, (table) => {
	return {
		voteChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "vote_chat_id_chat_id_fk"
		}),
		voteMessageIdMessageIdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [message.id],
			name: "vote_message_id_message_id_fk"
		}),
		voteChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "vote_chat_id_message_id_pk"}),
	}
});

export const document = pgTable("document", {
	id: uuid().defaultRandom().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	title: text().notNull(),
	content: text(),
	kind: varchar().default('text').notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => {
	return {
		documentUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "document_user_id_user_id_fk"
		}),
		documentIdCreatedAtPk: primaryKey({ columns: [table.id, table.createdAt], name: "document_id_created_at_pk"}),
	}
});
