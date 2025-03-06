// lib/typia/jsonschemas.ts
import typia from 'typia';
import { DbActions } from "../db/queries";
import { MethodParams, MethodReturn } from "../db/queries";
/**
 * We'll store param/return schemas for each method individually, logging them as we go.
 * This ensures each method's type inference is stable, and we can confirm Typia is generating them.
 */
export const schemas: Record<keyof DbActions, {
    paramSchema?: unknown;
    returnSchema?: unknown;
}> = {} as any;
// For logging success/failure
const succeeded: (keyof DbActions)[] = [];
const failed: (keyof DbActions)[] = [];
// A small helper for prettified JSON output
function logSchema(title: string, schema: unknown) {
    console.log(`[Typia]   ${title}`);
    console.dir(schema, { depth: Infinity, colors: true });
}
/**
 * Helper for safely generating param and return schemas for a method
 * This is reused in each individual method block
 */
function safeGenerateSchemas<T extends keyof DbActions>(methodName: T) {
    let paramSchema: unknown = undefined;
    let returnSchema: unknown = undefined;
    let paramSuccess = false;
    let returnSuccess = false;
    let methodSuccess = false;
    // Initialize schema entry
    schemas[methodName] = {};
    // Try to generate param schema
    try {
        type P = MethodParams<DbActions[T]>;
        paramSchema = {
            version: "3.1",
            components: {
                schemas: {
                    MethodParamsDbActionsT: {}
                }
            },
            schemas: [
                {
                    $ref: "#/components/schemas/MethodParamsDbActionsT"
                }
            ]
        } as import("typia").IJsonSchemaCollection<"3.1">;
        paramSuccess = true;
        schemas[methodName].paramSchema = paramSchema;
        console.log(`[Typia]     ✅ ${methodName} param schema success`);
        logSchema(`Param schema (${methodName})`, paramSchema);
    }
    catch (paramError) {
        console.warn(`[Typia]     ⚠️ ${methodName} param schema generation failed:`, paramError);
    }
    // Try to generate return schema (independently)
    try {
        type R = MethodReturn<DbActions[T]>;
        returnSchema = {
            version: "3.1",
            components: {
                schemas: {
                    MethodReturnDbActionsT: {}
                }
            },
            schemas: [
                {
                    $ref: "#/components/schemas/MethodReturnDbActionsT"
                }
            ]
        } as import("typia").IJsonSchemaCollection<"3.1">;
        returnSuccess = true;
        schemas[methodName].returnSchema = returnSchema;
        console.log(`[Typia]     ✅ ${methodName} return schema success`);
        logSchema(`Return schema (${methodName})`, returnSchema);
    }
    catch (returnError) {
        console.warn(`[Typia]     ⚠️ ${methodName} return schema generation failed:`, returnError);
    }
    // Track overall success/failure
    methodSuccess = paramSuccess || returnSuccess;
    if (methodSuccess) {
        succeeded.push(methodName);
        console.log(`[Typia]     ✅ ${methodName} overall success (params: ${paramSuccess}, return: ${returnSuccess})`);
    }
    else {
        failed.push(methodName);
        console.error(`[Typia]     ❌ ${methodName} complete failure - no schemas generated`);
    }
    return methodSuccess;
}
// --- Generate each method's schemas individually. No loops. ---
console.log('\n[Typia] Generating schemas for each method (no loops)...');
// 1) getUser
console.log('[Typia]   Generating schemas for "getUser"');
safeGenerateSchemas('getUser');
// 2) createUser
console.log('[Typia]   Generating schemas for "createUser"');
safeGenerateSchemas('createUser');
// 3) saveChat
console.log('[Typia]   Generating schemas for "saveChat"');
safeGenerateSchemas('saveChat');
// 4) deleteChatById
console.log('[Typia]   Generating schemas for "deleteChatById"');
safeGenerateSchemas('deleteChatById');
// 5) getChatsByUserId
console.log('[Typia]   Generating schemas for "getChatsByUserId"');
safeGenerateSchemas('getChatsByUserId');
// 6) getChatById
console.log('[Typia]   Generating schemas for "getChatById"');
safeGenerateSchemas('getChatById');
// 7) saveMessages
console.log('[Typia]   Generating schemas for "saveMessages"');
safeGenerateSchemas('saveMessages');
// 8) getMessagesByChatId
console.log('[Typia]   Generating schemas for "getMessagesByChatId"');
safeGenerateSchemas('getMessagesByChatId');
// 9) voteMessage
console.log('[Typia]   Generating schemas for "voteMessage"');
safeGenerateSchemas('voteMessage');
// 10) getVotesByChatId
console.log('[Typia]   Generating schemas for "getVotesByChatId"');
safeGenerateSchemas('getVotesByChatId');
// 11) saveDocument
console.log('[Typia]   Generating schemas for "saveDocument"');
safeGenerateSchemas('saveDocument');
// 12) getDocumentsById
console.log('[Typia]   Generating schemas for "getDocumentsById"');
safeGenerateSchemas('getDocumentsById');
// 13) getDocumentById
console.log('[Typia]   Generating schemas for "getDocumentById"');
safeGenerateSchemas('getDocumentById');
// 14) deleteDocumentsByIdAfterTimestamp
console.log('[Typia]   Generating schemas for "deleteDocumentsByIdAfterTimestamp"');
safeGenerateSchemas('deleteDocumentsByIdAfterTimestamp');
// 15) saveSuggestions
console.log('[Typia]   Generating schemas for "saveSuggestions"');
safeGenerateSchemas('saveSuggestions');
// 16) getSuggestionsByDocumentId
console.log('[Typia]   Generating schemas for "getSuggestionsByDocumentId"');
safeGenerateSchemas('getSuggestionsByDocumentId');
// 17) getMessageById
console.log('[Typia]   Generating schemas for "getMessageById"');
safeGenerateSchemas('getMessageById');
// 18) deleteMessagesByChatIdAfterTimestamp
console.log('[Typia]   Generating schemas for "deleteMessagesByChatIdAfterTimestamp"');
safeGenerateSchemas('deleteMessagesByChatIdAfterTimestamp');
// 19) updateChatVisiblityById
console.log('[Typia]   Generating schemas for "updateChatVisiblityById"');
safeGenerateSchemas('updateChatVisiblityById');
/** Final summary log */
console.log('\n[Typia] Schema Generation Summary:');
console.log(`  Succeeded (${succeeded.length}): ${succeeded.join(', ') || 'none'}`);
console.log(`  Failed (${failed.length}): ${failed.join(', ') || 'none'}\n`);
