import { apiEndpoints } from "@/lib/db/migrations/schema";
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq } from 'drizzle-orm';
import { JSONSchema7 } from "json-schema";

type JSONSchema = JSONSchema7;

export const maxDuration = 60;

const client = postgres(process.env.POSTGRES_URL!)
const db = drizzle(client)

interface AuthUser {
    id: string;
  }
  
  interface State {
    user: AuthUser | null;
  }
  interface ApiEndpointData {
    id: number;
    endpointId: string;
    name: string;
    method: string;
    tool: unknown; // matches the `tool: jsonb()` column
  }
  
  interface ToolCallResult {
    response: unknown;
    rawResponse: string | null;
  }
  
  interface YieldedValue {
    type: "tool_response";
    content: string;
  }
  
  interface ToolFunctionDefinition {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }
  
  interface ToolJson {
    function?: ToolFunctionDefinition;
  }

const endpointsData = await db.select().from(apiEndpoints).limit(10);
// .where(eq(apiEndpoints.name, 'DatasourcesRequestBuilder_GET'));
// console.dir(endpointsData, { depth: Infinity , colors: true });

const encoder = new TextEncoder();
let controllerRef: ReadableStreamDefaultController | undefined;

// Keep track of tool calls
let toolCallIndex = 0;

export async function* toolcall(
    // db: typeof dbType,
    name: string,
    parameters: Record<string, unknown>
  ): AsyncGenerator<
    { type: "content" | "tool_response" | "tool"; content: string },
    { response: { status: string; message: string; operation: string; [key: string]: unknown }, rawResponse: string | null }
  > {
    console.log(`[toolcall] Invoking tool "${name}" with parameters:`, JSON.stringify(parameters, null, 2));
  
    // Fetch tool metadata from database
    let toolData;
    try {
      const data = await db.select().from(apiEndpoints).where(eq(apiEndpoints.name, name));  
      if (data.length === 0) {
        console.error(`[toolcall] Tool "${name}" not found in database.`);
        return {
          response: {
            status: "error",
            message: `Tool "${name}" not found in database.`,
            operation: name,
          },
          rawResponse: null,
        };
      }
      toolData = data[0];
    } catch (err) {
      console.error("[toolcall] Error fetching tool metadata:", err);
      return {
        response: {
          status: "error",
          message: err instanceof Error ? err.message : String(err),
          operation: name,
        },
        rawResponse: null,
      };
    }
  
    const f = toolData;
    const clientName = f.client || 'graph';
  //   const { client } = createKiotaClient(clientName, userId);
    const segments = f.path ? f.path.split("?")[0].split("/").slice(1) : [];
    let currentBuilder = grafanaClient; // replaced 'any' with Record<string, unknown>
    const constructedPath: string[] = [];
  
    const pathParameters = (parameters.pathParameters ?? {}) as Record<string, unknown>;
    const requestConfiguration = (parameters.requestConfiguration ?? {}) as {
      headers?: Record<string, unknown>;
      queryParameters?: Record<string, unknown>;
      options?: Record<string, unknown>;
    };
    const body = parameters.body;
  
    function convertToKiotaParamName(pathParam: string): string {
      const cleanParam = pathParam.replace(/[{}]/g, "");
      return cleanParam.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    }
  
    function filterNullValues(obj: unknown): unknown {
      if (obj === null || obj === undefined || obj === '') return undefined;
      if (Array.isArray(obj)) {
        const filtered = obj
          .map(filterNullValues)
          .filter((v) => {
            if (v === null || v === undefined || v === '') return false;
            if (Array.isArray(v) && v.length === 0) return false;
            if (typeof v === "object" && v !== null && Object.keys(v).length === 0) return false;
            return true;
          });
        return filtered.length > 0 ? filtered : undefined;
      }
      if (typeof obj === "object" && obj !== null) {
        const filtered = Object.entries(obj)
          .map(([k, v]) => [k, filterNullValues(v)])
          .filter(([_, v]) => {
            if (v === null || v === undefined || v === '') return false;
            if (Array.isArray(v) && v.length === 0) return false;
            if (typeof v === "object" && v !== null && Object.keys(v).length === 0) return false;
            return true;
          });
        const result = Object.fromEntries(filtered);
        return Object.keys(result).length > 0 ? result : undefined;
      }
      return obj;
    }
  
    function convertToGraphParameters(params: Record<string, unknown>): Record<string, unknown> {
      const graphParams: Record<string, unknown> = {};
      const odataParams = ['top', 'skip', 'count', 'select', 'expand', 'filter', 'search', 'orderby'];
      for (const [key, value] of Object.entries(params)) {
        const lowerKey = key.toLowerCase();
        if (odataParams.includes(lowerKey)) {
          const graphKey = `$${lowerKey}`;
          graphParams[graphKey] = Array.isArray(value) ? value.join(',') : value;
          continue;
        }
        graphParams[key] = value;
      }
      return filterNullValues(graphParams) || {};
    }
  
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      try {
        if (segment.startsWith("{") && segment.endsWith("}")) {
          const paramId = segment.slice(1, -1);
          const kiotaParamName = convertToKiotaParamName(paramId);
          if (!pathParameters[kiotaParamName]) {
            console.error(`[toolcall] Missing required path parameter: ${kiotaParamName}`);
            return {
              response: {
                status: "error",
                message: `Required path parameter ${kiotaParamName} is missing.`,
                operation: name,
              },
              rawResponse: null,
            };
          }
  
          const paramValue = pathParameters[kiotaParamName];
          
          // Attempt to parse as a GUID and log if invalid
          if (typeof paramValue === "string") {
            const parsedGuid = parseGuidString(paramValue);
            if (paramValue && !parsedGuid) {
              console.warn(`[toolcall] The provided path parameter ${kiotaParamName}="${paramValue}" is not a valid GUID.`);
            }
          }
  
          const methodParamName = kiotaParamName.charAt(0).toUpperCase() + kiotaParamName.slice(1);
          const methodName = `by${methodParamName}`;
          if (typeof currentBuilder[methodName] !== "function") {
            console.error(`[toolcall] Method ${methodName} not found on currentBuilder for segment ${segment}`);
            return {
              response: {
                status: "error",
                message: `Method ${methodName} not found on currentBuilder`,
                operation: name,
              },
              rawResponse: null,
            };
          }
  
          console.log(`[toolcall] Setting path parameter ${kiotaParamName} to:`, paramValue);
          currentBuilder = currentBuilder[methodName](paramValue);
        } else {
          if (!currentBuilder[segment]) {
            console.error(`[toolcall] Segment ${segment} not found on currentBuilder`);
            return {
              response: {
                status: "error",
                message: `Segment ${segment} not found on currentBuilder`,
                operation: name,
              },
              rawResponse: null,
            };
          }
          console.log(`[toolcall] Navigating into segment: ${segment}`);
          currentBuilder = currentBuilder[segment];
        }
        constructedPath.push(segment);
  
        if (i === segments.length - 1) {
          try {
            let responseData: unknown;
            const method = f.method.toLowerCase();
            const queryParams = requestConfiguration.queryParameters || {};
            const queryParameters = convertToGraphParameters(queryParams);
  
            console.log(`[toolcall] Ready to execute ${method.toUpperCase()} on ${constructedPath.join("/")} with:`);
            console.log(`[toolcall] queryParameters:`, JSON.stringify(queryParameters, null, 2));
            console.log(`[toolcall] body:`, JSON.stringify(body, null, 2));
  
            if (method === "get") {
              console.log(`[toolcall] Executing GET request...`);
              responseData = await currentBuilder.get({
                queryParameters
              });
            } else if (method === "post") {
              if (!body) {
                console.error("[toolcall] Body is required for POST requests but not provided.");
                return {
                  response: {
                    status: "error",
                    message: "Body is required for POST requests",
                    operation: name,
                  },
                  rawResponse: null,
                };
              }
              const filteredBody = filterNullValues(body) as Record<string, unknown> ?? {};
              console.log(`[toolcall] Executing POST request with body:`, JSON.stringify(filteredBody, null, 2));
              responseData = await currentBuilder.post(filteredBody);
            } else if (method === "patch") {
              if (!body) {
                console.error("[toolcall] Body is required for PATCH requests but not provided.");
                return {
                  response: {
                    status: "error",
                    message: "Body is required for PATCH requests",
                    operation: name,
                  },
                  rawResponse: null,
                };
              }
              const filteredBody = filterNullValues(body) ?? {};
              console.log(`[toolcall] Executing PATCH request with body:`, JSON.stringify(filteredBody, null, 2));
              responseData = await currentBuilder.patch(filteredBody);
            } else if (method === "delete") {
              console.log(`[toolcall] Executing DELETE request...`);
              responseData = await currentBuilder.delete();
            } else {
              console.error(`[toolcall] Unsupported method: ${f.method}`);
              return {
                response: {
                  status: "error",
                  message: `Unsupported method: ${f.method}`,
                  operation: name,
                },
                rawResponse: null,
              };
            }
  
            const rawResponse = JSON.stringify(responseData, null, 2);
            console.log(`[toolcall] ${method.toUpperCase()} request successful. Raw response:`, rawResponse);
            yield { type: "tool_response", content: rawResponse };
  
            return {
              response: {
                status: "success",
                message: `Executed ${f.method.toUpperCase()} on ${constructedPath.join("/")}`,
                operation: name,
                response: responseData,
              },
              rawResponse,
            };
          } catch (err) {
            console.error(`[toolcall] Error executing ${f.method.toUpperCase()} request:`, err);
            return {
              response: {
                status: "error",
                message: err instanceof Error ? err.message : String(err),
                operation: name,
              },
              rawResponse: null,
            };
          }
        }
      } catch (err) {
        console.error("[toolcall] Error navigating path:", err);
        return {
          response: {
            status: "error",
            message: err instanceof Error ? err.message : String(err),
            operation: name,
          },
          rawResponse: null,
        };
      }
    }
  
    // If we reach here unexpectedly
    console.warn("[toolcall] No method executed after traversing all segments.");
    return {
      response: {
        status: "error",
        message: "No method executed",
        operation: name,
      },
      rawResponse: null,
    };
  }



export const transformedTools = endpointsData.filter((item) => {
    // We assume `tool` is stored as a JSON object with shape { function: ... }
    const toolObj = item.tool as ToolJson;
    return toolObj && toolObj.function;
  })
  .map((item) => {
    const toolObj = item.tool as ToolJson;
    const fn = toolObj.function!;
    return {
      type: "function" as const,
      function: {
        name: fn.name,
        description: (fn.description || "").slice(0, 1024),
        parameters: (fn.parameters || { type: "object" }) as JSONSchema,
        parse: (input: string) => {
          try {
            return JSON.parse(input) as Record<string, unknown>;
          } catch (err) {
            throw new Error(
              `Failed to parse function arguments: ${String(err)}`,
            );
          }
        },
        function: async (
          args: Record<string, unknown>,
          _runner: any
        ) => {
          // This is the function logic that calls your “toolcall”.
          const currentUserId = "12423535";
          const currentToolCallIndex = ++toolCallIndex;
  
          if (controllerRef) {
            const toolMeta = {
              toolName: fn.name,
              parameters: args,
              callNumber: currentToolCallIndex,
            };
            controllerRef.enqueue(
              encoder.encode(
                `event: toolDetails\ndata: ${JSON.stringify({
                  status: "Tool call started",
                  tool: toolMeta,
                })}\n\n`,
              ),
            );
          }
  
          // Use your Drizzle-based toolCall
          // Pass `db` instead of Supabase
          const gen = toolcall(fn.name, args);
          let finalResult: ToolCallResult | undefined;
          const startToolTime = performance.now();
  
          while (true) {
            const { value, done } = await gen.next();
            if (done) {
              if (value) finalResult = value;
              break;
            } else {
              // Intermediate tool responses
              if (controllerRef) {
                controllerRef.enqueue(
                  encoder.encode(
                    `event: toolDetails\ndata: ${JSON.stringify({
                      status: "Intermediate tool response",
                      content: value.content,
                      callNumber: currentToolCallIndex,
                    })}\n\n`,
                  ),
                );
              }
            }
          }
  
          const endToolTime = performance.now();
          const toolDuration = endToolTime - startToolTime;
          console.log(
            `[completions] Tool ${fn.name} completed with result:`,
            JSON.stringify(finalResult, null, 2),
          );
  
          if (controllerRef) {
            if (finalResult?.response && finalResult?.rawResponse) {
              const operationStatus = (finalResult.response as any)?.status || "success";
              const statusCode = (finalResult.response as any)?.statusCode || 200;
              const errorMessage = operationStatus === "error"
                ? (finalResult.response as any)?.message || "Unknown error"
                : null;
  
              const toolEndMeta = {
                toolName: fn.name,
                callNumber: currentToolCallIndex,
                rawResponse: finalResult.rawResponse,
                statusCode,
                error: errorMessage,
                durationMs: toolDuration,
              };
              controllerRef.enqueue(
                encoder.encode(
                  `event: toolDetails\ndata: ${JSON.stringify({
                    status: "Tool call completed",
                    details: toolEndMeta,
                  })}\n\n`,
                ),
              );
            }
          }
  
          return finalResult?.response ?? "No response from tool";
        },
      },
    } as RunnableToolFunction<Record<string, unknown>>;
  });