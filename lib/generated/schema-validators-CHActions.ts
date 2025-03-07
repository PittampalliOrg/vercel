import 'server-only';
import typia from 'typia';
import type { CHActions } from "../clickhouse";
type Params_fetchTraces = Parameters<CHActions["fetchTraces"]>;
type Return_fetchTraces = Awaited<ReturnType<CHActions["fetchTraces"]>>;
type Params_fetchTraceDetail = Parameters<CHActions["fetchTraceDetail"]>;
type Return_fetchTraceDetail = Awaited<ReturnType<CHActions["fetchTraceDetail"]>>;
type Params_fetchFilterOptions = Parameters<CHActions["fetchFilterOptions"]>;
type Return_fetchFilterOptions = Awaited<ReturnType<CHActions["fetchFilterOptions"]>>;
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
        const span = tracer.startSpan(`CHActions.${methodName}`, undefined, activeCtx);
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
    'fetchTraces': {
        version: "3.1",
        components: {
            schemas: {
                TracesResult: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/TraceSpan"
                            }
                        },
                        count: {
                            type: "number"
                        }
                    },
                    required: [
                        "data",
                        "count"
                    ]
                },
                TraceSpan: {
                    type: "object",
                    properties: {
                        Timestamp: {
                            type: "string"
                        },
                        TraceId: {
                            type: "string"
                        },
                        SpanId: {
                            type: "string"
                        },
                        ParentSpanId: {
                            type: "string"
                        },
                        SpanName: {
                            type: "string"
                        },
                        SpanKind: {
                            type: "string"
                        },
                        ServiceName: {
                            type: "string"
                        },
                        Duration: {
                            type: "number"
                        },
                        StatusCode: {
                            type: "string"
                        },
                        StatusMessage: {
                            type: "string"
                        },
                        ResourceAttributes: {
                            $ref: "#/components/schemas/Recordstringany"
                        },
                        SpanAttributes: {
                            $ref: "#/components/schemas/Recordstringany"
                        },
                        EventTimestamps: {
                            type: "array",
                            items: {
                                type: "string"
                            }
                        },
                        EventNames: {
                            type: "array",
                            items: {
                                type: "string"
                            }
                        },
                        EventAttributes: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/Recordstringany"
                            }
                        }
                    },
                    required: [
                        "Timestamp",
                        "TraceId",
                        "SpanId",
                        "SpanName",
                        "SpanKind",
                        "ServiceName",
                        "Duration",
                        "StatusCode",
                        "StatusMessage"
                    ]
                },
                Recordstringany: {
                    type: "object",
                    properties: {},
                    required: [],
                    description: "Construct a type with a set of properties K of type T",
                    additionalProperties: {}
                }
            }
        },
        schemas: [
            {
                $ref: "#/components/schemas/TracesResult"
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'fetchTraceDetail': {
        version: "3.1",
        components: {
            schemas: {
                Recordstringany: {
                    type: "object",
                    properties: {},
                    required: [],
                    description: "Construct a type with a set of properties K of type T",
                    additionalProperties: {}
                },
                TraceEvent: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string"
                        },
                        timestamp: {
                            type: "string"
                        },
                        attributes: {
                            $ref: "#/components/schemas/Recordstringany"
                        },
                        spanId: {
                            type: "string"
                        }
                    },
                    required: [
                        "name",
                        "timestamp",
                        "attributes",
                        "spanId"
                    ]
                },
                ProcessedSpan: {
                    type: "object",
                    properties: {
                        spanId: {
                            type: "string"
                        },
                        parentSpanId: {
                            type: "string"
                        },
                        name: {
                            type: "string"
                        },
                        kind: {
                            type: "string"
                        },
                        serviceName: {
                            type: "string"
                        },
                        startTime: {
                            type: "number"
                        },
                        duration: {
                            type: "number"
                        },
                        status: {
                            type: "string"
                        },
                        attributes: {
                            $ref: "#/components/schemas/Recordstringany"
                        }
                    },
                    required: [
                        "spanId",
                        "name",
                        "kind",
                        "serviceName",
                        "startTime",
                        "duration",
                        "status",
                        "attributes"
                    ]
                }
            }
        },
        schemas: [
            {
                type: "object",
                properties: {
                    traceId: {
                        type: "string"
                    },
                    timestamp: {
                        type: "string"
                    },
                    duration: {
                        type: "number"
                    },
                    serviceName: {
                        type: "string"
                    },
                    status: {
                        type: "string"
                    },
                    resourceAttributes: {
                        $ref: "#/components/schemas/Recordstringany"
                    },
                    spanAttributes: {
                        $ref: "#/components/schemas/Recordstringany"
                    },
                    events: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/TraceEvent"
                        }
                    },
                    spans: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/ProcessedSpan"
                        }
                    },
                    startTime: {
                        type: "number"
                    }
                },
                required: [
                    "traceId",
                    "timestamp",
                    "duration",
                    "serviceName",
                    "status",
                    "resourceAttributes",
                    "spanAttributes",
                    "events",
                    "spans",
                    "startTime"
                ]
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'fetchFilterOptions': {
        version: "3.1",
        components: {
            schemas: {}
        },
        schemas: [
            {
                type: "array",
                items: {
                    type: "string"
                }
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
} as const;
const methodParamTypeMap = {
    'fetchTraces': {
        version: "3.1",
        components: {
            schemas: {
                "GetTracesOptions.o1": {
                    type: "object",
                    properties: {
                        page: {
                            type: "number"
                        },
                        pageSize: {
                            type: "number"
                        },
                        sort: {
                            type: "string"
                        },
                        filters: {
                            $ref: "#/components/schemas/Recordstringstring"
                        }
                    },
                    required: [
                        "page",
                        "pageSize"
                    ]
                },
                Recordstringstring: {
                    type: "object",
                    properties: {},
                    required: [],
                    description: "Construct a type with a set of properties K of type T",
                    additionalProperties: {
                        type: "string"
                    }
                }
            }
        },
        schemas: [
            {
                type: "array",
                prefixItems: [
                    {
                        $ref: "#/components/schemas/GetTracesOptions.o1"
                    }
                ],
                additionalItems: false
            }
        ]
    } as import("typia").IJsonSchemaCollection<"3.1">,
    'fetchTraceDetail': {
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
    'fetchFilterOptions': {
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
} as const;
// ---------------- schemas object merging both maps -------------
export const schemas = {
    fetchTraces: {
        paramSchema: methodParamTypeMap['fetchTraces'],
        returnSchema: methodReturnTypeMap['fetchTraces']
    },
    fetchTraceDetail: {
        paramSchema: methodParamTypeMap['fetchTraceDetail'],
        returnSchema: methodReturnTypeMap['fetchTraceDetail']
    },
    fetchFilterOptions: {
        paramSchema: methodParamTypeMap['fetchFilterOptions'],
        returnSchema: methodReturnTypeMap['fetchFilterOptions']
    },
} as const;
// ---------------- Additional Exports -----------------------
export const paramSchemas = Object.entries(methodParamTypeMap).map(([key, schema]) => ({ key, schema }));
export const returnSchemas = Object.entries(methodReturnTypeMap).map(([key, schema]) => ({ key, schema }));
export const validatorsByName = Object.keys(methodParamTypeMap);
