import 'server-only';
import typia from 'typia';
import { DbActions } from "../db/queries";
import * as SchemaTypes from './schema-types';
// Define method return type mappings to our schema types
const methodReturnTypeMap = {
    'getUser': {
        version: "3.1",
        components: {
            schemas: {
                UserSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        email: {
                            type: "string"
                        },
                        password: {
                            type: "string"
                        }
                    },
                    required: [
                        "id",
                        "email",
                        "password"
                    ],
                    description: "This file contains simplified type definitions for database entities\nspecifically designed for typia schema generation.\nThese types match the structure of DB records but without Postgres-specific metadata."
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/UserSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatById': {
        version: "3.1",
        components: {
            schemas: {
                GetChatByIdResponse: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        },
                        userId: {
                            type: "string"
                        },
                        title: {
                            type: "string"
                        },
                        visibility: {
                            oneOf: [
                                {
                                    "const": "private"
                                },
                                {
                                    "const": "public"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "createdAt",
                        "userId",
                        "title"
                    ]
                }
            }
        },
        schemas: [
            {
                $ref: "#/components/schemas/GetChatByIdResponse"
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatsByUserId': {
        version: "3.1",
        components: {
            schemas: {
                ChatSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        },
                        userId: {
                            type: "string"
                        },
                        title: {
                            type: "string"
                        },
                        visibility: {
                            oneOf: [
                                {
                                    "const": "private"
                                },
                                {
                                    "const": "public"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "createdAt",
                        "userId",
                        "title"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/ChatSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessagesByChatId': {
        version: "3.1",
        components: {
            schemas: {
                MessageSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        chatId: {
                            type: "string"
                        },
                        role: {
                            type: "string"
                        },
                        content: {
                            type: "string"
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "chatId",
                        "role",
                        "content",
                        "createdAt"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/MessageSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getVotesByChatId': {
        version: "3.1",
        components: {
            schemas: {
                VoteSchema: {
                    type: "object",
                    properties: {
                        messageId: {
                            type: "string"
                        },
                        chatId: {
                            type: "string"
                        },
                        isUpvoted: {
                            type: "boolean"
                        }
                    },
                    required: [
                        "messageId",
                        "chatId",
                        "isUpvoted"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/VoteSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentsById': {
        version: "3.1",
        components: {
            schemas: {
                DocumentSchema: {
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
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "title",
                        "kind",
                        "content",
                        "userId",
                        "createdAt"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/DocumentSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentById': {
        version: "3.1",
        components: {
            schemas: {
                GetDocumentByIdResponse: {
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
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "title",
                        "kind",
                        "content",
                        "userId",
                        "createdAt"
                    ]
                }
            }
        },
        schemas: [
            {
                $ref: "#/components/schemas/GetDocumentByIdResponse"
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getSuggestionsByDocumentId': {
        version: "3.1",
        components: {
            schemas: {
                SuggestionSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        documentId: {
                            type: "string"
                        },
                        content: {
                            type: "string"
                        },
                        documentCreatedAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "documentId",
                        "content",
                        "documentCreatedAt",
                        "createdAt"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/SuggestionSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessageById': {
        version: "3.1",
        components: {
            schemas: {
                MessageSchema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string"
                        },
                        chatId: {
                            type: "string"
                        },
                        role: {
                            type: "string"
                        },
                        content: {
                            type: "string"
                        },
                        createdAt: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "date-time"
                                },
                                {
                                    type: "string"
                                }
                            ]
                        }
                    },
                    required: [
                        "id",
                        "chatId",
                        "role",
                        "content",
                        "createdAt"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "array",
                items: {
                    $ref: "#/components/schemas/MessageSchema"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">
};
// Define method parameter type mappings to our schema types
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
    'getChatById': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getChatsByUserId': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getMessagesByChatId': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getVotesByChatId': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentsById': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'getDocumentById': {
        version: "3.1",
        components: {
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
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
            schemas: {
                "GetByIdParams.o1": {
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
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetByIdParams.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">
};
// Export the combined schemas for validation
export const schemas = Object.keys(methodReturnTypeMap).reduce((acc, key) => {
    acc[key] = {
        returnSchema: methodReturnTypeMap[key as keyof typeof methodReturnTypeMap],
        paramSchema: methodParamTypeMap[key as keyof typeof methodParamTypeMap]
    };
    return acc;
}, {} as Record<string, {
    returnSchema: ReturnType<typeof typia.json.schemas>;
    paramSchema: ReturnType<typeof typia.json.schemas>;
}>);
