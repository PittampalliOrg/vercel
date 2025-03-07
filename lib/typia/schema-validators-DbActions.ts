import 'server-only';
import typia from 'typia';
import type { DbActions } from '../db/queries'; // type-only import

type Params_getUser = Parameters<DbActions["getUser"]>;
type Return_getUser = Awaited<ReturnType<DbActions["getUser"]>>;
type Params_createUser = Parameters<DbActions["createUser"]>;
type Return_createUser = Awaited<ReturnType<DbActions["createUser"]>>;
type Params_saveChat = Parameters<DbActions["saveChat"]>;
type Return_saveChat = Awaited<ReturnType<DbActions["saveChat"]>>;
type Params_deleteChatById = Parameters<DbActions["deleteChatById"]>;
type Return_deleteChatById = Awaited<ReturnType<DbActions["deleteChatById"]>>;
type Params_getChatsByUserId = Parameters<DbActions["getChatsByUserId"]>;
type Return_getChatsByUserId = Awaited<ReturnType<DbActions["getChatsByUserId"]>>;
type Params_getChatById = Parameters<DbActions["getChatById"]>;
type Return_getChatById = Awaited<ReturnType<DbActions["getChatById"]>>;
type Params_saveMessages = Parameters<DbActions["saveMessages"]>;
type Return_saveMessages = Awaited<ReturnType<DbActions["saveMessages"]>>;
type Params_getMessagesByChatId = Parameters<DbActions["getMessagesByChatId"]>;
type Return_getMessagesByChatId = Awaited<ReturnType<DbActions["getMessagesByChatId"]>>;
type Params_voteMessage = Parameters<DbActions["voteMessage"]>;
type Return_voteMessage = Awaited<ReturnType<DbActions["voteMessage"]>>;
type Params_getVotesByChatId = Parameters<DbActions["getVotesByChatId"]>;
type Return_getVotesByChatId = Awaited<ReturnType<DbActions["getVotesByChatId"]>>;
type Params_saveDocument = Parameters<DbActions["saveDocument"]>;
type Return_saveDocument = Awaited<ReturnType<DbActions["saveDocument"]>>;
type Params_getDocumentsById = Parameters<DbActions["getDocumentsById"]>;
type Return_getDocumentsById = Awaited<ReturnType<DbActions["getDocumentsById"]>>;
type Params_getDocumentById = Parameters<DbActions["getDocumentById"]>;
type Return_getDocumentById = Awaited<ReturnType<DbActions["getDocumentById"]>>;
type Params_deleteDocumentsByIdAfterTimestamp = Parameters<DbActions["deleteDocumentsByIdAfterTimestamp"]>;
type Return_deleteDocumentsByIdAfterTimestamp = Awaited<ReturnType<DbActions["deleteDocumentsByIdAfterTimestamp"]>>;
type Params_saveSuggestions = Parameters<DbActions["saveSuggestions"]>;
type Return_saveSuggestions = Awaited<ReturnType<DbActions["saveSuggestions"]>>;
type Params_getSuggestionsByDocumentId = Parameters<DbActions["getSuggestionsByDocumentId"]>;
type Return_getSuggestionsByDocumentId = Awaited<ReturnType<DbActions["getSuggestionsByDocumentId"]>>;
type Params_getMessageById = Parameters<DbActions["getMessageById"]>;
type Return_getMessageById = Awaited<ReturnType<DbActions["getMessageById"]>>;
type Params_deleteMessagesByChatIdAfterTimestamp = Parameters<DbActions["deleteMessagesByChatIdAfterTimestamp"]>;
type Return_deleteMessagesByChatIdAfterTimestamp = Awaited<ReturnType<DbActions["deleteMessagesByChatIdAfterTimestamp"]>>;
type Params_updateChatVisiblityById = Parameters<DbActions["updateChatVisiblityById"]>;
type Return_updateChatVisiblityById = Awaited<ReturnType<DbActions["updateChatVisiblityById"]>>;

// ---------------- ValidateAndLog snippet ----------------
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('db-actions');

/**
 * Decorator that wraps methods with:
 * - Parameter & return validation (via `typia.is`)
 * - OpenTelemetry tracing (creates or continues a Span)
 * - Attaches the relevant schemas as trace attributes
 */
export function ValidateAndLog(target: any, methodName: string, descriptor: PropertyDescriptor) {
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
        span.setAttribute(`schemas.${methodName}.param`, JSON.stringify(paramSchema.schemas[0]));
      }
      if (returnSchema) {
        span.setAttribute(`schemas.${methodName}.return`, JSON.stringify(returnSchema.schemas[0]));
      }

      // Parameter validation
      if (paramSchema) {
        const paramValidation = typia.is(args);
        span.addEvent('Parameter Validation', {
          expected: JSON.stringify(paramSchema.schemas[0]),
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
          expected: JSON.stringify(returnSchema.schemas[0]),
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


// ---------------- Method Return / Param Maps -------------

const methodReturnTypeMap = {
  'getUser': typia.json.schemas<[Return_getUser], "3.1">(),
  'createUser': undefined /* Problematic return */,
  'saveChat': undefined /* Problematic return */,
  'deleteChatById': undefined /* Problematic return */,
  'getChatsByUserId': typia.json.schemas<[Return_getChatsByUserId], "3.1">(),
  'getChatById': typia.json.schemas<[Return_getChatById], "3.1">(),
  'saveMessages': undefined /* Problematic return */,
  'getMessagesByChatId': typia.json.schemas<[Return_getMessagesByChatId], "3.1">(),
  'voteMessage': undefined /* Problematic return */,
  'getVotesByChatId': typia.json.schemas<[Return_getVotesByChatId], "3.1">(),
  'saveDocument': undefined /* Problematic return */,
  'getDocumentsById': typia.json.schemas<[Return_getDocumentsById], "3.1">(),
  'getDocumentById': typia.json.schemas<[Return_getDocumentById], "3.1">(),
  'deleteDocumentsByIdAfterTimestamp': undefined /* Problematic return */,
  'saveSuggestions': undefined /* Problematic return */,
  'getSuggestionsByDocumentId': typia.json.schemas<[Return_getSuggestionsByDocumentId], "3.1">(),
  'getMessageById': typia.json.schemas<[Return_getMessageById], "3.1">(),
  'deleteMessagesByChatIdAfterTimestamp': undefined /* Problematic return */,
  'updateChatVisiblityById': undefined /* Problematic return */,
} as const;

const methodParamTypeMap = {
  'getUser': typia.json.schemas<[Params_getUser], "3.1">(),
  'createUser': typia.json.schemas<[Params_createUser], "3.1">(),
  'saveChat': typia.json.schemas<[Params_saveChat], "3.1">(),
  'deleteChatById': typia.json.schemas<[Params_deleteChatById], "3.1">(),
  'getChatsByUserId': typia.json.schemas<[Params_getChatsByUserId], "3.1">(),
  'getChatById': typia.json.schemas<[Params_getChatById], "3.1">(),
  'saveMessages': typia.json.schemas<[Params_saveMessages], "3.1">(),
  'getMessagesByChatId': typia.json.schemas<[Params_getMessagesByChatId], "3.1">(),
  'voteMessage': typia.json.schemas<[Params_voteMessage], "3.1">(),
  'getVotesByChatId': typia.json.schemas<[Params_getVotesByChatId], "3.1">(),
  'saveDocument': typia.json.schemas<[Params_saveDocument], "3.1">(),
  'getDocumentsById': typia.json.schemas<[Params_getDocumentsById], "3.1">(),
  'getDocumentById': typia.json.schemas<[Params_getDocumentById], "3.1">(),
  'deleteDocumentsByIdAfterTimestamp': typia.json.schemas<[Params_deleteDocumentsByIdAfterTimestamp], "3.1">(),
  'saveSuggestions': typia.json.schemas<[Params_saveSuggestions], "3.1">(),
  'getSuggestionsByDocumentId': typia.json.schemas<[Params_getSuggestionsByDocumentId], "3.1">(),
  'getMessageById': typia.json.schemas<[Params_getMessageById], "3.1">(),
  'deleteMessagesByChatIdAfterTimestamp': typia.json.schemas<[Params_deleteMessagesByChatIdAfterTimestamp], "3.1">(),
  'updateChatVisiblityById': typia.json.schemas<[Params_updateChatVisiblityById], "3.1">(),
} as const;

// ---------------- schemas object merging both maps -------------
export const schemas = {
  getUser: {
    paramSchema: methodParamTypeMap['getUser'],
    returnSchema: methodReturnTypeMap['getUser']
  },
  createUser: {
    paramSchema: methodParamTypeMap['createUser'],
    returnSchema: methodReturnTypeMap['createUser']
  },
  saveChat: {
    paramSchema: methodParamTypeMap['saveChat'],
    returnSchema: methodReturnTypeMap['saveChat']
  },
  deleteChatById: {
    paramSchema: methodParamTypeMap['deleteChatById'],
    returnSchema: methodReturnTypeMap['deleteChatById']
  },
  getChatsByUserId: {
    paramSchema: methodParamTypeMap['getChatsByUserId'],
    returnSchema: methodReturnTypeMap['getChatsByUserId']
  },
  getChatById: {
    paramSchema: methodParamTypeMap['getChatById'],
    returnSchema: methodReturnTypeMap['getChatById']
  },
  saveMessages: {
    paramSchema: methodParamTypeMap['saveMessages'],
    returnSchema: methodReturnTypeMap['saveMessages']
  },
  getMessagesByChatId: {
    paramSchema: methodParamTypeMap['getMessagesByChatId'],
    returnSchema: methodReturnTypeMap['getMessagesByChatId']
  },
  voteMessage: {
    paramSchema: methodParamTypeMap['voteMessage'],
    returnSchema: methodReturnTypeMap['voteMessage']
  },
  getVotesByChatId: {
    paramSchema: methodParamTypeMap['getVotesByChatId'],
    returnSchema: methodReturnTypeMap['getVotesByChatId']
  },
  saveDocument: {
    paramSchema: methodParamTypeMap['saveDocument'],
    returnSchema: methodReturnTypeMap['saveDocument']
  },
  getDocumentsById: {
    paramSchema: methodParamTypeMap['getDocumentsById'],
    returnSchema: methodReturnTypeMap['getDocumentsById']
  },
  getDocumentById: {
    paramSchema: methodParamTypeMap['getDocumentById'],
    returnSchema: methodReturnTypeMap['getDocumentById']
  },
  deleteDocumentsByIdAfterTimestamp: {
    paramSchema: methodParamTypeMap['deleteDocumentsByIdAfterTimestamp'],
    returnSchema: methodReturnTypeMap['deleteDocumentsByIdAfterTimestamp']
  },
  saveSuggestions: {
    paramSchema: methodParamTypeMap['saveSuggestions'],
    returnSchema: methodReturnTypeMap['saveSuggestions']
  },
  getSuggestionsByDocumentId: {
    paramSchema: methodParamTypeMap['getSuggestionsByDocumentId'],
    returnSchema: methodReturnTypeMap['getSuggestionsByDocumentId']
  },
  getMessageById: {
    paramSchema: methodParamTypeMap['getMessageById'],
    returnSchema: methodReturnTypeMap['getMessageById']
  },
  deleteMessagesByChatIdAfterTimestamp: {
    paramSchema: methodParamTypeMap['deleteMessagesByChatIdAfterTimestamp'],
    returnSchema: methodReturnTypeMap['deleteMessagesByChatIdAfterTimestamp']
  },
  updateChatVisiblityById: {
    paramSchema: methodParamTypeMap['updateChatVisiblityById'],
    returnSchema: methodReturnTypeMap['updateChatVisiblityById']
  },
} as const;

// ---------------- Additional Exports -----------------------

export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);

