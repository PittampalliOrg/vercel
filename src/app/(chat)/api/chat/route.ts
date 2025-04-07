import { type Message, createDataStreamResponse } from "ai"
import type { Session } from "next-auth"
import { auth } from "@/app/(auth)/auth"
import { deleteChatById, getChatById, saveChat, saveMessages } from "@/lib/db/queries"
import { getMostRecentUserMessage } from "@/lib/utils"
import { generateTitleFromUserMessage } from "../../actions"
import { logger } from "@/lib/logger"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// --- Use Environment Variable for Bridge URL - Ensure Correct Port (6279) ---
// Example for Docker Compose: BACKEND_BRIDGE_URL=http://mcp-manager:6279/api/bridge/chat
// Example for same machine: BACKEND_BRIDGE_URL=http://localhost:6279/api/bridge/chat
const bridgeUrl = process.env.BACKEND_BRIDGE_URL || `http://registry:6279/api/bridge/chat` // Default to localhost and HTTP port
logger.info(`[API Route] Using bridge URL: ${bridgeUrl}`)

export async function POST(request: Request) {
  let session: Session | null = null
  let userId: string | undefined = undefined

  try {
    session = await auth()
    if (!session?.user?.id) {
      logger.warn("[API Route] Unauthorized access attempt.")
      return new Response("Unauthorized", { status: 401 })
    }
    userId = session.user.id

    const {
      id: chatId,
      messages,
      selectedChatModel,
      primaryServerId,
      selectedTools,
    }: {
      id: string
      messages: Array<Message>
      selectedChatModel: string
      primaryServerId: string | null
      selectedTools?: string[]
    } = await request.json()

    const userMessage = getMostRecentUserMessage(messages)
    if (!userMessage) {
      logger.warn(`[API Route] No user message found for chat ${chatId}.`)
      return new Response("No user message found", { status: 400 })
    }

    const chat = await getChatById({ id: chatId })
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage })
      await saveChat({ id: chatId, userId: userId, title })
      logger.info(`[API Route] Created new chat ${chatId} with title "${title}".`)
    }
    if (userMessage.role === "user") {
      await saveMessages({
        messages: [{ ...userMessage, createdAt: new Date(), chatId: chatId }],
      })
    }

    logger.info(`[API Route] Forwarding chat request for ${chatId} to bridge: ${bridgeUrl}`)
    const bridgeRequestPayload = {
      prompt: typeof userMessage.content === "string" ? userMessage.content : "",
      history: messages.slice(0, -1),
      selectedTools: selectedTools ?? [],
      sessionId: chatId,
    }

    logger.debug(`[API Route] Bridge Payload for chat ${chatId}:`, JSON.stringify(bridgeRequestPayload))

    // --- Fetch from Backend Bridge ---
    const bridgeResponse = await fetch(bridgeUrl, {
      // Use the configured bridgeUrl
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bridgeRequestPayload),
    })

    if (!bridgeResponse.ok) {
      const errorText = await bridgeResponse.text()
      logger.error(
        `[API Route] Bridge request failed for chat ${chatId}. Status: ${bridgeResponse.status}. Error: ${errorText}`,
      )
      return new Response(
        JSON.stringify({ error: `Backend bridge request failed: Status ${bridgeResponse.status} - ${errorText}` }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (!bridgeResponse.body) {
      logger.error(`[API Route] Bridge response body is null for chat ${chatId}. Status: ${bridgeResponse.status}.`)
      throw new Error("Backend bridge returned empty response body.")
    }

    logger.info(`[API Route] Received streaming response from bridge for chat ${chatId}.`)

    // Use createDataStreamResponse with the execute pattern
    return createDataStreamResponse({
      execute: async (dataWriter) => {
        try {
          const reader = bridgeResponse.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          function processBuffer() {
            let boundary = buffer.indexOf("\n\n")
            while (boundary >= 0) {
              const message = buffer.substring(0, boundary)
              buffer = buffer.substring(boundary + 2)
              if (message.startsWith("data:")) {
                const jsonData = message.substring("data:".length).trim()
                if (jsonData) {
                  try {
                    const bridgeChunk = JSON.parse(jsonData)
                    switch (bridgeChunk.type) {
                      case "chatChunk":
                        // Write text content
                        dataWriter.write(`0:${bridgeChunk.content}\n`)
                        break
                      case "toolStart":
                        // Format tool start as text
                        dataWriter.write(`0:[Using tool: ${bridgeChunk.toolName}]\n`)
                        break
                      case "toolEnd":
                        // Format tool end as text
                        dataWriter.write(`0:[Tool ${bridgeChunk.toolName} completed]\n`)
                        break
                      case "chatError":
                        // Format error as text
                        dataWriter.write(`0:[Error: ${bridgeChunk.error}]\n`)
                        break
                      case "chatEnd":
                        // Format chat end as text
                        dataWriter.write(`0:[Chat completed]\n`)
                        break
                      default:
                        logger.warn(`[API Route] Unknown chunk type from bridge: ${bridgeChunk.type}`)
                    }
                  } catch (parseError: any) {
                    logger.error(
                      `[API Route] Failed to parse JSON from bridge stream for ${chatId}: ${parseError.message}. Data: "${jsonData}"`,
                    )
                    throw new Error("Failed to parse stream data from backend.")
                  }
                }
              }
              boundary = buffer.indexOf("\n\n")
            }
            return true
          }

          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              logger.info(`[API Route] Bridge stream finished for chat ${chatId}.`)
              if (buffer.trim()) {
                processBuffer()
              }
              break
            }
            buffer += decoder.decode(value, { stream: true })
            if (!processBuffer()) break
          }
        } catch (streamError: any) {
          logger.error(`[API Route] Error reading stream from bridge for chat ${chatId}: ${streamError.message}`)
          throw streamError
        }
      },
      onError: (error) => {
        logger.error(
          `[API Route] Stream error for chat ${chatId}: ${error instanceof Error ? error.message : String(error)}`,
        )
        return `Error processing chat: ${error instanceof Error ? error.message : "Unknown error"}`
      },
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
      },
    })
  } catch (error: unknown) {
    logger.error("[API Route] Unhandled error in POST /api/chat:", error)
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred."
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// DELETE handler remains the same
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return new Response("Chat ID required", { status: 400 })
  }
  const session = await auth()
  if (!session || !session.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  try {
    const chat = await getChatById({ id })
    if (!chat) {
      return new Response("Not Found", { status: 404 })
    }
    if (chat.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 })
    }
    await deleteChatById({ id })
    logger.info(`[API Route] Deleted chat ${id} for user ${session.user.id}.`)
    return new Response(null, { status: 204 })
  } catch (error) {
    logger.error(`[API Route] Error deleting chat ${id}:`, error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

