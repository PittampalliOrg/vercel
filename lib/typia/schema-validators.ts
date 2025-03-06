import 'server-only';
import typia from 'typia';
import { DbActions } from '../db/queries';
import * as SchemaTypes from './schema-types';

// Define method return type mappings to our schema types
const methodReturnTypeMap = {
  'getUser': typia.json.schemas<[SchemaTypes.GetUserResponse], "3.1">(),
  'getChatById': typia.json.schemas<[SchemaTypes.GetChatByIdResponse], "3.1">(),
  'getChatsByUserId': typia.json.schemas<[SchemaTypes.GetChatsByUserIdResponse], "3.1">(),
  'getMessagesByChatId': typia.json.schemas<[SchemaTypes.GetMessagesByIdResponse], "3.1">(),
  'getVotesByChatId': typia.json.schemas<[SchemaTypes.GetVotesResponse], "3.1">(),
  'getDocumentsById': typia.json.schemas<[SchemaTypes.GetDocumentsResponse], "3.1">(),
  'getDocumentById': typia.json.schemas<[SchemaTypes.GetDocumentByIdResponse], "3.1">(),
  'getSuggestionsByDocumentId': typia.json.schemas<[SchemaTypes.GetSuggestionsResponse], "3.1">(),
  'getMessageById': typia.json.schemas<[SchemaTypes.GetMessagesByIdResponse], "3.1">()
};

// Define method parameter type mappings to our schema types
const methodParamTypeMap = {
  'getUser': typia.json.schemas<[[string]], "3.1">(),
  'getChatById': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getChatsByUserId': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getMessagesByChatId': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getVotesByChatId': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getDocumentsById': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getDocumentById': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">(),
  'getSuggestionsByDocumentId': typia.json.schemas<[[{ documentId: string }]], "3.1">(),
  'getMessageById': typia.json.schemas<[[SchemaTypes.GetByIdParams]], "3.1">()
};

// Export the combined schemas for validation
export const schemas = Object.keys(methodReturnTypeMap).reduce((acc, key) => {
  acc[key] = {
    returnSchema: methodReturnTypeMap[key as keyof typeof methodReturnTypeMap],
    paramSchema: methodParamTypeMap[key as keyof typeof methodParamTypeMap]
  };
  return acc;
}, {} as Record<string, {
  returnSchema: ReturnType<typeof typia.json.schemas>,
  paramSchema: ReturnType<typeof typia.json.schemas>
}>);
