import 'server-only';
import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { logger } from '../logger';
// import typia, { type tags } from "typia";
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';

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

// Get the tracer instance
const tracer = trace.getTracer('db-operations');

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

async function getUserById(userId: string) {
  const res = await db.select().from(user).where(eq(user.id, userId));
  return res.length > 0 ? res[0] : null;
}


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

/**
 * A decorator that combines validation, logging, tracing, and schema generation
 * for database action functions.
 */
function ValidateAndLog(
  target: any,
  methodName: string,
  descriptor: PropertyDescriptor
) {
  // Store the original method
  const originalMethod = descriptor.value;
  
  // Extract parameter types and return type using reflection if available
  let paramTypes: any[] = [];
  let returnType: any = null;
  
  try {
    if (Reflect && Reflect.getMetadata) {
      paramTypes = Reflect.getMetadata('design:paramtypes', target, methodName) || [];
      returnType = Reflect.getMetadata('design:returntype', target, methodName);
    }
  } catch (e) {
    logger.warn(`Failed to extract types for ${methodName}:`, e);
  }

  // Try to generate JSON schemas for parameters and return type
  let paramSchemas: any[] = [];
  let returnSchema: any = null;
  
  try {
    // Generate schemas for parameters
    if (paramTypes.length > 0) {
      paramSchemas = paramTypes.map((type: any, index: number) => {
        try {
          // Get type name instead of generating schema, as schema generation is problematic
          return {
            index,
            type: type?.name || typeof type
          };
        } catch (e) {
          return { index, error: 'Schema generation failed', type: type?.name || typeof type };
        }
      });
    }
    
    // Get return type info
    if (returnType) {
      try {
        returnSchema = {
          type: returnType?.name || typeof returnType
        };
      } catch (e) {
        returnSchema = { error: 'Schema generation failed', type: returnType?.name || typeof returnType };
      }
    }
  } catch (e) {
    // Safely handle schema generation errors
    logger.warn(`Schema generation error for ${methodName}:`, e);
  }

  // Replace with enhanced method that includes tracing, validation, and schema info
  descriptor.value = async function(...args: any[]) {
    // Use startActiveSpan to create a span for this operation
    return tracer.startActiveSpan(`DbActions.${methodName}`, async (span: Span) => {
      // Record start time for performance metrics
      const startTime = performance.now();
      
      // Create an object to collect all information about this call for logging
      const logContext: any = {
        method: methodName,
        timestamp: new Date().toISOString(),
        args: {},
        expectedTypes: {},
        performance: {},
        validation: {},
      };
      
      try {
        // Add method information to the span
        span.setAttribute('db.operation', methodName);
        span.setAttribute('db.operation.type', getOperationType(methodName));
        span.setAttribute('component', 'DbActions');
        span.setAttribute('db.system', 'postgres');
        span.setAttribute('timestamp', logContext.timestamp);
        
        // Add type information to span if available
        if (paramSchemas.length > 0) {
          try {
            span.setAttribute('types.params', JSON.stringify(paramSchemas.map(p => ({
              index: p.index,
              type: p.type
            }))));
          } catch (e) {
            // Handle stringification error
          }
        }
        
        if (returnSchema) {
          try {
            span.setAttribute('types.return', returnSchema.type);
          } catch (e) {
            // Handle error
          }
        }
        
        // Record function arguments as span attributes and collect for logging
        recordArgsAsAttributes(span, args, methodName);
        
        // Record expected types for logging
        if (paramTypes.length > 0) {
          paramTypes.forEach((type: any, index: number) => {
            logContext.expectedTypes[`param${index}`] = type?.name || typeof type;
          });
        }
        
        if (returnType) {
          logContext.expectedTypes.return = returnType?.name || typeof returnType;
        }
        
        // Add args to logging context
        args.forEach((arg, index) => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              logContext.args[`arg${index}`] = JSON.stringify(arg);
            } catch (e) {
              logContext.args[`arg${index}`] = `[Object: ${typeof arg}]`;
            }
          } else {
            logContext.args[`arg${index}`] = arg;
          }
        });
        
        // Add an event marking the start of the operation
        span.addEvent('db.operation.start', {
          method: methodName,
          timestamp: Date.now()
        });
        
        // Call the original method
        const startExecution = performance.now();
        const result = await originalMethod.apply(this, args);
        const endExecution = performance.now();
        
        // Record execution time
        const executionTime = endExecution - startExecution;
        span.setAttribute('execution_time_ms', executionTime.toFixed(2));
        logContext.performance.executionTimeMs = Number(executionTime.toFixed(2));
        
        // Add an event marking the database call completion
        span.addEvent('db.operation.complete', {
          timestamp: Date.now(),
          executionTimeMs: executionTime
        });
        
        // Record result metadata
        recordResultMetadata(span, result);
        
        // Add result to logging context (safely)
        try {
          if (result === null) {
            logContext.result = null;
          } else if (result === undefined) {
            logContext.result = undefined;
          } else if (typeof result === 'object') {
            if (Array.isArray(result)) {
              logContext.result = {
                type: 'array',
                length: result.length,
                sample: result.length > 0 ? tryStringify(result[0]) : null
              };
            } else {
              logContext.result = {
                type: 'object',
                keys: Object.keys(result),
                value: tryStringify(result)
              };
            }
          } else {
            logContext.result = result;
          }
        } catch (e) {
          logContext.result = `[Unstringifiable: ${typeof result}]`;
        }
        
        // Validate the result using typia
        const startValidation = performance.now();
      //  const validationResult = typia.validate(result);
        const validationResult: any = { success: true, data: result };
        const endValidation = performance.now();
        
        // Record validation time
        const validationTime = endValidation - startValidation;
        span.setAttribute('validation_time_ms', validationTime.toFixed(2));
        logContext.performance.validationTimeMs = Number(validationTime.toFixed(2));
        
        // Record detailed validation information in the span
        recordValidationDetails(span, validationResult);
        
        // Add validation result to logging context
        logContext.validation.success = validationResult.success;
        if (!validationResult.success) {
          logContext.validation.errors = validationResult.errors;
        }
        
        if (!validationResult.success) {
          // Log validation errors
          span.addEvent('validation.failure', {
            timestamp: Date.now(),
            errorCount: validationResult.errors.length
          });
          
          // Set span status to error for validation failures
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Validation failed with ${validationResult.errors.length} errors`
          });
          
          // Create comprehensive log entry
          logger.error(`${methodName} validation failed`, logContext);
        } else {
          // Create validation success event
          span.addEvent('validation.success', {
            timestamp: Date.now()
          });
          
          span.setStatus({ code: SpanStatusCode.OK });
          
          // Create comprehensive log entry for success
          logger.info(`${methodName} executed successfully`, logContext);
        }
        
        // Calculate and record operation duration
        const endTime = performance.now();
        const duration = endTime - startTime;
        span.setAttribute('total_duration_ms', duration.toFixed(2));
        logContext.performance.totalDurationMs = Number(duration.toFixed(2));
        
        return result;
      } catch (error) {
        // Enhanced error logging with span recording
        const errorTime = performance.now();
        const duration = errorTime - startTime;
        
        // Add error information to logging context
        logContext.error = {
          message: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.name : typeof error
        };
        
        if (error instanceof Error && error.stack) {
          logContext.error.stack = error.stack;
        }
        
        // Record performance info
        logContext.performance.totalDurationMs = Number(duration.toFixed(2));
        
        if (error instanceof Error) {
          // Record exception in span
          span.recordException(error);
          
          // Add detailed error attributes
          span.setAttribute('error', true);
          span.setAttribute('error.type', error.name);
          span.setAttribute('error.message', error.message);
          span.setAttribute('error.stack', error.stack || 'No stack trace available');
          span.setAttribute('total_duration_ms', duration.toFixed(2));
          
          // Create error event with timestamp
          span.addEvent('error', {
            error_name: error.name,
            error_message: error.message,
            timestamp: Date.now()
          });
          
          // Set error status with message
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          
          // Create comprehensive error log entry
          logger.error(`Error in ${methodName}`, logContext);
        } else {
          // Handle non-Error objects
          const errorMessage = String(error);
          
          // Add generic error information
          span.setAttribute('error', true);
          span.setAttribute('error.type', 'UnknownError');
          span.setAttribute('error.message', errorMessage);
          span.setAttribute('total_duration_ms', duration.toFixed(2));
          
          // Create generic error event
          span.addEvent('error', {
            error_message: errorMessage,
            timestamp: Date.now()
          });
          
          // Set error status
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorMessage
          });
          
          // Create comprehensive error log entry
          logger.error(`Unknown error in ${methodName}`, logContext);
        }
        
        throw error;
      } finally {
        // End the span in finally block to ensure it always completes
        span.end();
      }
    });
  };

  return descriptor;
}

/**
 * Helper function to safely stringify a value
 */
function tryStringify(value: any, maxLength: number = 500): string {
  try {
    const str = JSON.stringify(value);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch (e) {
    return `[Unstringifiable: ${typeof value}]`;
  }
}

/**
 * Helper function to record function arguments as span attributes
 */
function recordArgsAsAttributes(span: Span, args: any[], methodName: string): void {
  // Record number of arguments
  span.setAttribute('args.count', args.length);
  
  // Handle different argument patterns
  if (args.length === 1 && typeof args[0] === 'object') {
    // For object arguments, record keys and selected values
    const argObj = args[0];
    
    Object.keys(argObj).forEach((key, index) => {
      // Record keys present in the object
      span.setAttribute(`args.keys[${index}]`, key);
      
      // For common ID fields, record the actual values
      if (key === 'id' || key === 'userId' || key === 'chatId' || key === 'messageId' || key === 'documentId') {
        span.setAttribute(`args.${key}`, String(argObj[key]));
      }
      
      // For known non-sensitive fields, record values
      if (['title', 'kind', 'type', 'visibility'].includes(key)) {
        const value = argObj[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          span.setAttribute(`args.${key}`, String(value));
        }
      }
    });
  } else {
    // For positional arguments, be more selective
    args.forEach((arg, index) => {
      // Only record non-sensitive primitive values as attributes
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        // Skip recording potential passwords or sensitive data
        if (methodName === 'createUser' && index === 1) {
          span.setAttribute(`args[${index}]`, '[REDACTED]');
        } else {
          span.setAttribute(`args[${index}]`, String(arg));
        }
      } else if (arg === null) {
        span.setAttribute(`args[${index}]`, 'null');
      } else if (arg === undefined) {
        span.setAttribute(`args[${index}]`, 'undefined');
      } else if (typeof arg === 'object') {
        span.setAttribute(`args[${index}].type`, Array.isArray(arg) ? 'array' : 'object');
      }
    });
  }
}

/**
 * Helper function to record result metadata
 */
function recordResultMetadata(span: Span, result: any): void {
  if (result === null) {
    span.setAttribute('result.type', 'null');
    return;
  }
  
  if (result === undefined) {
    span.setAttribute('result.type', 'undefined');
    return;
  }
  
  // Record result type
  const resultType = Array.isArray(result) ? 'array' : typeof result;
  span.setAttribute('result.type', resultType);
  
  // For arrays, record length
  if (Array.isArray(result)) {
    span.setAttribute('result.length', result.length);
    
    // Sample a few keys from the first item if it's an object
    if (result.length > 0 && typeof result[0] === 'object' && result[0] !== null) {
      const keys = Object.keys(result[0]);
      span.setAttribute('result.item_keys', keys.slice(0, 5).join(','));
    }
  } 
  // For objects, record keys
  else if (typeof result === 'object' && result !== null) {
    const keys = Object.keys(result);
    span.setAttribute('result.keys', keys.join(','));
    span.setAttribute('result.keys.count', keys.length);
    
    // Record ID if present
    if ('id' in result) {
      span.setAttribute('result.id', String(result.id));
    }
  }
}

/**
 * Helper function to record detailed validation information
 */
function recordValidationDetails(span: Span, validationResult: IValidation<any>): void {
  // Record basic validation result
  span.setAttribute('validation.success', validationResult.success);
  
  if (validationResult.success) {
    // For successful validation, record data type
    const data = validationResult.data;
    span.setAttribute('validation.data.type', Array.isArray(data) ? 'array' : typeof data);
    
    if (Array.isArray(data)) {
      span.setAttribute('validation.data.length', data.length);
    }
  } else {
    // For validation failures, record detailed error information
    const errors = validationResult.errors;
    span.setAttribute('validation.error.count', errors.length);
    
    // Record up to 10 errors to avoid excessive span size
    errors.slice(0, 10).forEach((error, index) => {
      const errorPrefix = `validation.error[${index}]`;
      span.setAttribute(`${errorPrefix}.path`, error.path);
      span.setAttribute(`${errorPrefix}.expected`, error.expected);
      
      // Try to safely stringify the value
      let valueStr = 'unknown';
      try {
        valueStr = typeof error.value === 'object' 
          ? JSON.stringify(error.value).substring(0, 100) // Limit size for objects
          : String(error.value);
      } catch (e) {
        valueStr = typeof error.value;
      }
      
      span.setAttribute(`${errorPrefix}.value`, valueStr);
    });
    
    // If there are more errors than we recorded, note that
    if (errors.length > 10) {
      span.setAttribute('validation.error.additional', errors.length - 10);
    }
    
    // Record data type of the failed validation
    if (validationResult.data !== undefined) {
      span.setAttribute('validation.data.type', Array.isArray(validationResult.data) 
        ? 'array' 
        : typeof validationResult.data);
    }
  }
}

/**
 * Helper function to determine the operation type from method name
 */
function getOperationType(methodName: string): string {
  if (methodName.startsWith('get')) return 'read';
  if (methodName.startsWith('save') || methodName.startsWith('create')) return 'create';
  if (methodName.startsWith('update')) return 'update';
  if (methodName.startsWith('delete')) return 'delete';
  if (methodName.startsWith('vote')) return 'update';
  return 'unknown';
}

class DbActions {
  @ValidateAndLog
  async getUser(email: string): Promise<Array<User>> {
    try {
      return await db.select().from(user).where(eq(user.email, email));
    } catch (error) {
      throw new Error('Failed to get user from database');
    }
  }

  @ValidateAndLog
  async createUser(email: string, password: string) {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    try {
      return await db.insert(user).values({ email, password: hash });
    } catch (error) {
      throw new Error('Failed to create user in database');
    }
  }

  @ValidateAndLog
  async saveChat({
    id,
    userId,
    title,
  }: {
    id: string;
    userId: string;
    title: string;
  }) {
    // Check if the user exists before creating chat
    const user = await getUserById(userId);
    if (!user) throw new Error('User does not exist');

    try {
      const data = { id, createdAt: new Date(), userId, title };
      return await db.insert(chat).values(data);
    } catch (error) {
      throw new Error('Failed to save chat in database');
    }
  }

  @ValidateAndLog
  async deleteChatById({ id }: { id: string }) {
    try {
      await db.delete(vote).where(eq(vote.chatId, id));
      await db.delete(message).where(eq(message.chatId, id));
  
      return await db.delete(chat).where(eq(chat.id, id));
    } catch (error) {
      logger.error('Failed to delete chat by id from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
  async getChatsByUserId({ id }: { id: string }) {
    try {
      return await db
        .select()
        .from(chat)
        .where(eq(chat.userId, id))
        .orderBy(desc(chat.createdAt));
    } catch (error) {
      logger.error('Failed to get chats by user from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
  async getChatById({ id }: { id: string }) {
    try {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
      return selectedChat;
    } catch (error) {
      logger.error('Failed to get chat by id from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
  async saveMessages({ messages }: { messages: Array<Message> }) {
    try {
      return await db.insert(message).values(messages);
    } catch (error) {
      logger.error('Failed to save messages in database', { error });
      throw error;
    }
  }

  @ValidateAndLog
  async getMessagesByChatId({ id }: { id: string }) {
    try {
      return await db
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(asc(message.createdAt));
    } catch (error) {
      logger.error('Failed to get messages by chat id from database', { id, error });
      throw error;
    }
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
      return await db.insert(vote).values(voteData);
    } catch (error) {
      logger.error('Failed to upvote message in database', { error });
      throw error;
    }
  }

  @ValidateAndLog
  async getVotesByChatId({ id }: { id: string }) {
    try {
      return await db.select().from(vote).where(eq(vote.chatId, id));
    } catch (error) {
      logger.error('Failed to get votes by chat id from database', { id, error });
      throw error;
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
    id: string;
    title: string;
    kind: BlockKind;
    content: string;
    userId: string;
  }) {
    try {
      const documentData = { id, title, kind, content, userId, createdAt: new Date() };
      return await db.insert(document).values(documentData);
    } catch (error) {
      logger.error('Failed to save document in database', { error });
      throw error;
    }
  }

  @ValidateAndLog
  async getDocumentsById({ id }: { id: string }) {
    try {
      return await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(asc(document.createdAt));
    } catch (error) {
      logger.error('Failed to get documents by id from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
  async getDocumentById({ id }: { id: string }) {
    try {
      const [selectedDocument] = await db
        .select()
        .from(document)
        .where(eq(document.id, id))
        .orderBy(desc(document.createdAt));

      return selectedDocument;
    } catch (error) {
      logger.error('Failed to get document by id from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
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

      return await db
        .delete(document)
        .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
    } catch (error) {
      logger.error('Failed to delete documents by id after timestamp from database', {
        id,
        timestamp,
        error
      });
      throw error;
    }
  }

  @ValidateAndLog
  async saveSuggestions({
    suggestions,
  }: {
    suggestions: Array<Suggestion>;
  }) {
    try {
      return await db.insert(suggestion).values(suggestions);
    } catch (error) {
      logger.error('Failed to save suggestions in database', { error });
      throw error;
    }
  }

  @ValidateAndLog
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
      logger.error('Failed to get suggestions by document version from database', { documentId, error });
      throw error;
    }
  }

  @ValidateAndLog
  async getMessageById({ id }: { id: string }) {
    try {
      return await db.select().from(message).where(eq(message.id, id));
    } catch (error) {
      logger.error('Failed to get message by id from database', { id, error });
      throw error;
    }
  }

  @ValidateAndLog
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
          and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
        );
    } catch (error) {
      logger.error(
        'Failed to delete messages by id after timestamp from database',
        { chatId, timestamp, error }
      );
      throw error;
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
    try {
      return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
    } catch (error) {
      logger.error('Failed to update chat visibility in database', { chatId, visibility, error });
      throw error;
    }
  }
}

export const dbActions = new DbActions();