import {
    type Message,
    createDataStreamResponse,
    smoothStream,
    streamText,
    ToolSet, // Use ToolSet type
    DataStreamWriter,
} from "ai";
import { Session } from "next-auth";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/models";
// Removed getLocalTools import
import { systemPrompt } from "@/lib/ai/prompts";
import { deleteChatById, getChatById, saveChat, saveMessages } from "@/lib/db/queries";
import { generateUUID, getMostRecentUserMessage } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { ZodError } from "zod";

export const maxDuration = 60;

export async function POST(request: Request) {
  let session: Session | null = null;

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
      availableTools // Only MCP tools definitions (formatted by client)
    }: {
      id: string;
      messages: Array<Message>;
      selectedChatModel: string;
      availableTools: ToolSet;
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

    if (userMessage.role === 'user') {
         await saveMessages({
             messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
         });
    }

    return createDataStreamResponse({
      execute: async (dataStream: DataStreamWriter) => {
        try {
          // Local tools are no longer merged here

          const model = myProvider.languageModel(selectedChatModel);
          console.log(`Using model: ${selectedChatModel} for chat ${id}`);
          console.log("MCP Tools provided to LLM:", Object.keys(availableTools));
           // Log schemas for debugging if needed
           Object.entries(availableTools).forEach(([name, toolDef]) => {
              console.log(`  Tool: ${name}, Schema:`, JSON.stringify((toolDef as any).parameters || {}));
           });


          const result = streamText({
            model: model,
            system: systemPrompt({ selectedChatModel }),
            messages,
            tools: availableTools, // Pass only the MCP tool definitions
            maxSteps: 5, // Keep multi-step in case LLM needs sequential MCP calls
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
                        console.log(`Saved ${assistantMessagesToSave.length} assistant message(s) for chat ${id}.`);
                    }
                    console.log(`LLM Interaction Steps for chat ${id}:`, JSON.stringify(steps, null, 2));
                } catch (error: unknown) {
                    console.error(`Failed to save messages for chat ${id} during onFinish:`, error);
                }
            },
            experimental_telemetry: {
              isEnabled: true,
              functionId: "stream-text-mcp-only", // Updated ID
            },
             // No need for onToolCall here as no local tools are executed server-side
          });

          result.consumeStream();
          // Pass all stream parts (including tool_calls for MCP tools) back to client
          result.mergeIntoDataStream(dataStream, { sendReasoning: true });

        } catch (error: unknown) {
          console.error(`Error during stream execution for chat ${id}:`, error);
          if (error instanceof ZodError) {
             console.error("Zod Validation Error details:", JSON.stringify(error.issues, null, 2));
          }
          throw error;
        }
      },
      onError: (error: unknown): string => {
        console.error(`Error setting up stream response for chat ${id} (onError):`, error);
         if (error instanceof TypeError) {
             console.error("TypeError Detail:", error.message, error.stack);
         } else if (error instanceof Error) {
              console.error("Generic Error Detail:", error.message, error.stack);
         }
        return "An error occurred while processing your request.";
      },
    });

  } catch (error: unknown) {
    console.error("Error in POST /api/chat route handler:", error);
    return new Response("An internal server error occurred.", { status: 500 });
  }
}

// DELETE Handler remains the same
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
      console.error("Error deleting chat:", error);
      return new Response("An error occurred while processing your request", {
        status: 500,
      });
    }
}