import {
    type Message,
    createDataStreamResponse,
    smoothStream,
    streamText,
    experimental_createMCPClient,
    ToolSet, // Correctly import ToolSet
    DataStreamWriter,
    // MCPClient type might be internal; use inferred type instead
} from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { Session } from "next-auth";

import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/models";
import { getLocalTools } from "@/lib/ai/tools";
import { systemPrompt } from "@/lib/ai/prompts";
import { deleteChatById, getChatById, saveChat, saveMessages } from "@/lib/db/queries";
import { generateUUID, getMostRecentUserMessage } from "@/lib/utils";
import { ServerConfig } from "@/lib/mcp/config";

import { generateTitleFromUserMessage } from "../../actions";

// Infer the MCPClient type if it's not directly exported
type InferredMCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;

export const maxDuration = 60;

// Helper function to safely close MCP clients
async function closeMcpClients(clients: InferredMCPClient[]) {
  if (!clients || clients.length === 0) return;
  console.log(`Closing ${clients.length} MCP client(s)...`);
  await Promise.allSettled(
    clients.map((client, index) =>
      client.close().catch((e: unknown) => console.error(`Error closing client ${index}:`, e)) // Type error as unknown
    )
  );
  console.log("MCP clients closed.");
}

export async function POST(request: Request) {
  let session: Session | null = null;
  let mcpClients: InferredMCPClient[] = []; // Use inferred type

  try {
    session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userId = session.user.id;

    const {
      id,
      messages,
      selectedChatModel,
      activeMcpConfigs
    }: {
      id: string;
      messages: Array<Message>;
      selectedChatModel: string;
      activeMcpConfigs: Array<ServerConfig>;
    } = await request.json();

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return new Response("No user message found", { status: 400 });
    }

    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: userId, title });
    }

    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });

    return createDataStreamResponse({
      execute: async (dataStream: DataStreamWriter) => { // Ensure dataStream type is explicit if needed elsewhere
        let aggregatedTools: ToolSet = {};

        try {
          if (activeMcpConfigs && activeMcpConfigs.length > 0) {
             // Explicitly type config in map callback
            mcpClients = await Promise.all(
              activeMcpConfigs.map(async (config: ServerConfig): Promise<InferredMCPClient> => {
                console.log(`Initializing MCP client for: ${config.name} (${config.transport})`);
                if (config.transport === 'stdio') {
                  const stdioTransport = new Experimental_StdioMCPTransport({
                    command: config.command,
                    args: config.args || [],
                    env: config.env || {},
                  });
                  return await experimental_createMCPClient({ transport: stdioTransport });
                } else if (config.transport === 'sse') {
                  return await experimental_createMCPClient({
                    transport: {
                      type: 'sse',
                      url: config.url,
                      headers: config.headers || {},
                    },
                  });
                } else {
                  throw new Error(`Unsupported transport type for config ${config}}`);
                }
              })
            );
            console.log(`${mcpClients.length} MCP client(s) initialized.`);

            // Fetch and aggregate tools with explicit types
            const toolSets = await Promise.all(mcpClients.map(client => client.tools()));
            aggregatedTools = toolSets.reduce((acc: ToolSet, tools: ToolSet) => ({ ...acc, ...tools }), {} as ToolSet);
            console.log("Aggregated MCP Tools:", Object.keys(aggregatedTools));
          } else {
             console.log("No active MCP servers configured.");
          }

          const localTools = getLocalTools({ session: session!, dataStream });

          const allTools: ToolSet = { // Ensure final type is ToolSet
            ...localTools,
            ...aggregatedTools,
          };
           console.log("All Available Tools (Local + MCP):", Object.keys(allTools));

          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel }),
            messages,
            maxSteps: 5,
            tools: allTools,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
            onFinish: async ({ response, reasoning, steps }) => {
                try {
                    const assistantMessagesToSave = response.messages
                        .filter(msg => msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim() !== '')
                        .map((message) => ({
                            id: message.id || generateUUID(),
                            chatId: id,
                            role: message.role,
                            content: message.content as string,
                            createdAt: new Date(),
                        }));

                    if (assistantMessagesToSave.length > 0) {
                        await saveMessages({ messages: assistantMessagesToSave });
                        console.log(`Saved ${assistantMessagesToSave.length} assistant message(s).`);
                    }
                    console.log("LLM Interaction Steps:", JSON.stringify(steps, null, 2));
                } catch (error: unknown) { // Type error as unknown
                    console.error("Failed to save messages in database during onFinish:", error);
                } finally {
                    await closeMcpClients(mcpClients);
                    mcpClients = [];
                }
            },
            experimental_telemetry: {
              isEnabled: true,
              functionId: "stream-text",
            },
          });

          result.consumeStream();
          result.mergeIntoDataStream(dataStream, { sendReasoning: true });

        } catch (error: unknown) { // Type error as unknown
          console.error("Error during stream execution:", error);
          await closeMcpClients(mcpClients); // Cleanup on error
          mcpClients = [];
          // Instead of closeWithError, rethrow or handle to let createDataStreamResponse manage it
          // dataStream.close(); // Close normally, error state is handled by throwing
          throw error; // Rethrow the error to signal failure
        }
      },
       // Make onError synchronous and return a string
      onError: (error: unknown): string => {
        console.error("Error setting up stream response (onError callback):", error);
        // Cleanup should happen in the catch block of execute
        // await closeMcpClients(mcpClients); // Don't await here
        return "Oops, an error occurred setting up the chat!";
      },
    });

  } catch (error: unknown) { // Type error as unknown
    console.error("Error in POST /api/chat route handler:", error);
    await closeMcpClients(mcpClients); // Attempt cleanup
    return new Response("An internal server error occurred.", { status: 500 });
  }
}


// DELETE Handler (no changes needed from previous version)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    console.error("Error deleting chat:", error); // Add logging
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}