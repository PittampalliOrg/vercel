import { type Message, createDataStreamResponse, smoothStream, streamText, experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"

import { auth } from "@/app/(auth)/auth"
import { myProvider } from "@/lib/ai/models"
import { systemPrompt } from "@/lib/ai/prompts"
import { deleteChatById, getChatById, saveChat, saveMessages } from "@/lib/db/queries"
import { generateUUID, getMostRecentUserMessage, sanitizeResponseMessages } from "@/lib/utils"

import { generateTitleFromUserMessage } from "../../actions"

export const maxDuration = 60

export async function POST(request: Request) {
  const { id, messages, selectedChatModel }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  const session = await auth()

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userMessage = getMostRecentUserMessage(messages)

  if (!userMessage) {
    return new Response("No user message found", { status: 400 })
  }

  const chat = await getChatById({ id })

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage })
    await saveChat({ id, userId: session.user.id, title })
  }

  // Save only the user message
  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  })

  return createDataStreamResponse({
    execute: async (dataStream) => {
      try {
        // Initialize MCP client with stdio transport
        const stdioTransport = new Experimental_StdioMCPTransport({
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-postgres", "postgres://postgres:postgres@db:5432/postgres"],
        })

        const stdioClient = await experimental_createMCPClient({
          transport: stdioTransport,
        })

        // You can add an SSE transport if needed
        // const sseClient = await experimental_createMCPClient({
        //   transport: {
        //     type: 'sse',
        //     url: process.env.MCP_SSE_URL || '',
        //   },
        // });

        // Get tools from the MCP servers
        const stdioTools = await stdioClient.tools()
        // const sseTools = await sseClient.tools();

        // Combine tools from different sources
        const tools = {
          ...stdioTools,
          // ...sseTools,
        }

        console.log("MCP Tools:", tools)

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          tools,
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          onFinish: async ({ response, reasoning }) => {
            // Close all MCP clients when done
            await stdioClient.close()
            // await sseClient.close();

            if (session.user?.id) {
              try {
                const sanitizedResponseMessages = sanitizeResponseMessages({
                  messages: response.messages,
                  reasoning,
                })

                // Filter out tool call messages before saving to the database
                const messagesToSave = sanitizedResponseMessages.filter((message) => {
                  // Check if message has a role property
                  if (!message.role) return false

                  // Skip messages with specific roles
                  if (message.role === "tool") return false

                  // Skip messages with IDs that start with "msg-"
                  if (message.id?.startsWith("msg-")) return false

                  // Skip messages that might have toolCalls property
                  // Using type assertion to check if property exists
                  const anyMessage = message as any
                  if (anyMessage.toolCalls) return false

                  return true
                })

                // Only save messages if there are any non-tool-call messages
                if (messagesToSave.length > 0) {
                  await saveMessages({
                    messages: messagesToSave.map((message) => {
                      return {
                        id: message.id,
                        chatId: id,
                        role: message.role,
                        content: message.content,
                        createdAt: new Date(),
                      }
                    }),
                  })
                }
              } catch (error) {
                console.error("Failed to save messages in database", error)
                console.error("Failed to save chat")
              }
            }
          },
          experimental_telemetry: {
            isEnabled: true,
            functionId: "stream-text",
          },
        })

        result.consumeStream()

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        })
      } catch (error) {
        console.error("Error initializing MCP clients:", error)
        throw error
      }
    },
    onError: (error) => {
      console.error("Error in stream:", error)
      return "Oops, an error occurred!"
    },
  })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return new Response("Not Found", { status: 404 })
  }

  const session = await auth()

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const chat = await getChatById({ id })

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    await deleteChatById({ id })

    return new Response("Chat deleted", { status: 200 })
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    })
  }
}

