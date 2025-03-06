import 'server-only';
import typia from 'typia';
import type { DbActions } from "../db/queries";
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
                const paramValidation = (() => { return (input: any): input is Array<any> => Array.isArray(input); })()(args);
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
                const resultValidation = (() => { return (input: any): input is any => true; })()(result);
                span.addEvent('Return Validation', {
                    expected: JSON.stringify(returnSchema.schemas[0]),
                    received: JSON.stringify(result),
                    validationPassed: resultValidation,
                });
                span.setAttribute('return.result', JSON.stringify(result));
            }
            return result;
        }
        catch (error: any) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
            throw error;
        }
        finally {
            span.end();
        }
    };
}
// ---------------- Method Return / Param Maps -------------
const methodReturnTypeMap = {
    'getUser': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        email: {
                            type: "string"
                        },
                        password: {
                            oneOf: [
                                {
                                    type: "null"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "email",
                        "password"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'createUser': undefined /* Problematic return */,
    'saveChat': undefined /* Problematic return */,
    'deleteChatById': undefined /* Problematic return */,
    'getChatsByUserId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        title: {
                            type: "string"
                        },
                        userId: {
                            type: "string"
                        },
                        visibility: {
                            oneOf: [
                                {
                                    "const": "public"
                                },
                                {
                                    "const": "private"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "createdAt",
                        "title",
                        "userId",
                        "visibility"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "object",
                properties: {
                    id: {
                        type: "string"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time"
                    },
                    title: {
                        type: "string"
                    },
                    userId: {
                        type: "string"
                    },
                    visibility: {
                        oneOf: [
                            {
                                "const": "public"
                            },
                            {
                                "const": "private"
                            }
                        ]
                    }
                },
                required: [
                    "id",
                    "createdAt",
                    "title",
                    "userId",
                    "visibility"
                ]
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveMessages': undefined /* Problematic return */,
    'getMessagesByChatId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        chatId: {
                            type: "string"
                        },
                        role: {
                            type: "string"
                        },
                        content: {}
                    },
                    required: [
                        "id",
                        "createdAt",
                        "chatId",
                        "role",
                        "content"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'voteMessage': undefined /* Problematic return */,
    'getVotesByChatId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        chatId: {
                            type: "string"
                        },
                        messageId: {
                            type: "string"
                        },
                        isUpvoted: {
                            type: "boolean"
                        }
                    },
                    required: [
                        "chatId",
                        "messageId",
                        "isUpvoted"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveDocument': undefined /* Problematic return */,
    'getDocumentsById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        title: {
                            type: "string"
                        },
                        userId: {
                            type: "string"
                        },
                        content: {
                            oneOf: [
                                {
                                    type: "null"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        },
                        kind: {
                            oneOf: [
                                {
                                    "const": "text"
                                },
                                {
                                    "const": "code"
                                },
                                {
                                    "const": "image"
                                },
                                {
                                    "const": "sheet"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "createdAt",
                        "title",
                        "userId",
                        "content",
                        "kind"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "object",
                properties: {
                    id: {
                        type: "string"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time"
                    },
                    title: {
                        type: "string"
                    },
                    userId: {
                        type: "string"
                    },
                    content: {
                        oneOf: [
                            {
                                type: "null"
                            },
                            {
                                type: "string"
                            }
                        ]
                    },
                    kind: {
                        oneOf: [
                            {
                                "const": "text"
                            },
                            {
                                "const": "code"
                            },
                            {
                                "const": "image"
                            },
                            {
                                "const": "sheet"
                            }
                        ]
                    }
                },
                required: [
                    "id",
                    "createdAt",
                    "title",
                    "userId",
                    "content",
                    "kind"
                ]
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'deleteDocumentsByIdAfterTimestamp': undefined /* Problematic return */,
    'saveSuggestions': undefined /* Problematic return */,
    'getSuggestionsByDocumentId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        userId: {
                            type: "string"
                        },
                        description: {
                            oneOf: [
                                {
                                    type: "null"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        },
                        documentId: {
                            type: "string"
                        },
                        documentCreatedAt: {
                            type: "string",
                            format: "date-time"
                        },
                        originalText: {
                            type: "string"
                        },
                        suggestedText: {
                            type: "string"
                        },
                        isResolved: {
                            type: "boolean"
                        }
                    },
                    required: [
                        "id",
                        "createdAt",
                        "userId",
                        "description",
                        "documentId",
                        "documentCreatedAt",
                        "originalText",
                        "suggestedText",
                        "isResolved"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessageById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        chatId: {
                            type: "string"
                        },
                        role: {
                            type: "string"
                        },
                        content: {}
                    },
                    required: [
                        "id",
                        "createdAt",
                        "chatId",
                        "role",
                        "content"
                    ]
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'deleteMessagesByChatIdAfterTimestamp': undefined /* Problematic return */,
    'updateChatVisiblityById': undefined /* Problematic return */,
} as const;
const methodParamTypeMap = {
    'getUser': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "string"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'createUser': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "string"
                    },
                    {
                        type: "string"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveChat': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            },
                            userId: {
                                type: "string"
                            },
                            title: {
                                type: "string"
                            }
                        },
                        required: [
                            "id",
                            "userId",
                            "title"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'deleteChatById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatsByUserId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveMessages': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            messages: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: {
                                            type: "string"
                                        },
                                        createdAt: {
                                            type: "string",
                                            format: "date-time"
                                        },
                                        chatId: {
                                            type: "string"
                                        },
                                        role: {
                                            type: "string"
                                        },
                                        content: {}
                                    },
                                    required: [
                                        "id",
                                        "createdAt",
                                        "chatId",
                                        "role",
                                        "content"
                                    ]
                                }
                            }
                        },
                        required: [
                            "messages"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessagesByChatId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'voteMessage': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            chatId: {
                                type: "string"
                            },
                            messageId: {
                                type: "string"
                            },
                            type: {
                                oneOf: [
                                    {
                                        "const": "up"
                                    },
                                    {
                                        "const": "down"
                                    }
                                ]
                            }
                        },
                        required: [
                            "chatId",
                            "messageId",
                            "type"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getVotesByChatId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveDocument': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            },
                            title: {
                                type: "string"
                            },
                            kind: {
                                oneOf: [
                                    {
                                        "const": "text"
                                    },
                                    {
                                        "const": "code"
                                    },
                                    {
                                        "const": "image"
                                    },
                                    {
                                        "const": "sheet"
                                    }
                                ]
                            },
                            content: {
                                type: "string"
                            },
                            userId: {
                                type: "string"
                            }
                        },
                        required: [
                            "id",
                            "title",
                            "kind",
                            "content",
                            "userId"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentsById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'deleteDocumentsByIdAfterTimestamp': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            },
                            timestamp: {
                                type: "string",
                                format: "date-time"
                            }
                        },
                        required: [
                            "id",
                            "timestamp"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'saveSuggestions': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            suggestions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: {
                                            type: "string"
                                        },
                                        createdAt: {
                                            type: "string",
                                            format: "date-time"
                                        },
                                        userId: {
                                            type: "string"
                                        },
                                        description: {
                                            oneOf: [
                                                {
                                                    type: "null"
                                                },
                                                {
                                                    type: "string"
                                                }
                                            ]
                                        },
                                        documentId: {
                                            type: "string"
                                        },
                                        documentCreatedAt: {
                                            type: "string",
                                            format: "date-time"
                                        },
                                        originalText: {
                                            type: "string"
                                        },
                                        suggestedText: {
                                            type: "string"
                                        },
                                        isResolved: {
                                            type: "boolean"
                                        }
                                    },
                                    required: [
                                        "id",
                                        "createdAt",
                                        "userId",
                                        "description",
                                        "documentId",
                                        "documentCreatedAt",
                                        "originalText",
                                        "suggestedText",
                                        "isResolved"
                                    ]
                                }
                            }
                        },
                        required: [
                            "suggestions"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getSuggestionsByDocumentId': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            documentId: {
                                type: "string"
                            }
                        },
                        required: [
                            "documentId"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessageById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            id: {
                                type: "string"
                            }
                        },
                        required: [
                            "id"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'deleteMessagesByChatIdAfterTimestamp': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            chatId: {
                                type: "string"
                            },
                            timestamp: {
                                type: "string",
                                format: "date-time"
                            }
                        },
                        required: [
                            "chatId",
                            "timestamp"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'updateChatVisiblityById': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        type: "object",
                        properties: {
                            chatId: {
                                type: "string"
                            },
                            visibility: {
                                oneOf: [
                                    {
                                        "const": "public"
                                    },
                                    {
                                        "const": "private"
                                    }
                                ]
                            }
                        },
                        required: [
                            "chatId",
                            "visibility"
                        ]
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
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
