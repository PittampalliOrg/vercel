"use client"

import type { Attachment, Message, ToolCall } from "ai"
import { useChat } from "@ai-sdk/react"
import { useState, useEffect, useMemo } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js"

import { ChatHeader } from "@/components/chat-header"
import type { Vote } from "@/lib/db/schema"
import { fetcher, generateUUID } from "@/lib/utils"
import { Artifact } from "./artifact"
import { MultimodalInput } from "./multimodal-input"
import { Messages } from "./messages"
import type { VisibilityType } from "./visibility-selector"
import { useArtifactSelector } from "@/hooks/use-artifact"
import { useMcpManager } from "@/lib/contexts/McpManagerContext"
import { convertMcpToolsToAiSdkFormat } from "@/lib/ai/format-tools"
import { ActiveMCPServers } from "@/components/active-mcp-servers"
import { McpConnectionState } from "@/lib/mcp/mcp.types" // Adjust path if needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatProps {
  className?: string
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string
  initialMessages: Array<Message>
  selectedChatModel: string
  selectedVisibilityType: VisibilityType
  isReadonly: boolean
}) {
  const { mutate } = useSWRConfig()
  const {
    wsStatus,
    serverStates,
    serverTools,
    sendMcpRequest,
    // FIX: Remove fetchToolsForServer from destructuring
  } = useMcpManager()

  const [primaryServerId, setPrimaryServerId] = useState<string | null>(null)
  const [llmTools, setLlmTools] = useState<ReturnType<typeof convertMcpToolsToAiSdkFormat>>({})

  const runningServers = useMemo(
    () => Object.values(serverStates).filter((s) => s.status === McpConnectionState.Running),
    [serverStates],
  )

  // Effect 1: Manage primaryServerId selection
  useEffect(() => {
    const currentPrimaryRunning =
      primaryServerId && serverStates[primaryServerId]?.status === McpConnectionState.Running
    if (!currentPrimaryRunning) {
      const firstRunningId = runningServers[0]?.id ?? null
      if (primaryServerId !== firstRunningId) {
        console.log(`[Chat] Auto-updating primary server ID to: ${firstRunningId}`)
        setPrimaryServerId(firstRunningId)
      }
    }
  }, [primaryServerId, serverStates, runningServers])

  // Effect 3: Format tools *only* when successfully fetched
  useEffect(() => {
    const toolsState = primaryServerId ? serverTools[primaryServerId] : null
    let toolsChanged = false

    // Check if tools are fetched and valid before formatting
    if (toolsState?.status === "fetched" && Array.isArray(toolsState.tools)) {
      const formatted = convertMcpToolsToAiSdkFormat(toolsState.tools as McpTool[])
      if (JSON.stringify(formatted) !== JSON.stringify(llmTools)) {
        console.log(`[Chat] Updating LLM tools for ${primaryServerId}:`, Object.keys(formatted))
        setLlmTools(formatted)
        toolsChanged = true
      }
    } else if (primaryServerId && toolsState?.status !== "fetched" && Object.keys(llmTools).length > 0) {
      // Clear tools if the primary server changes OR if the tool state is no longer 'fetched' (e.g., becomes 'idle' or 'error')
      console.log(
        `[Chat] Clearing LLM tools (primary server changed or tools not fetched for ${primaryServerId}). Status: ${toolsState?.status}`,
      )
      setLlmTools({})
      toolsChanged = true
    } else if (!primaryServerId && Object.keys(llmTools).length > 0) {
      // Clear tools if no primary server is selected
      console.log("[Chat] Clearing LLM tools (no primary server selected).")
      setLlmTools({})
      toolsChanged = true
    }
    // Log if needed:
    // if (!toolsChanged) console.debug("[Chat] LLM tools unchanged.");
  }, [primaryServerId, serverTools, llmTools]) // Keep dependencies

  // --- AI SDK useChat Hook ---
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading: isChatHookLoading,
    stop,
    reload,
    // FIX: Removed toolCalls from destructuring since it doesn't exist
  } = useChat({
    id,
    api: "/frontend/api/chat", // Your backend endpoint
    body: {
      // Data sent WITH EACH request to your backend
      id, // Chat ID
      selectedChatModel, // The LLM model selected by the user
      // Pass the formatted tools AVAILABLE WHEN THE MESSAGE IS SENT
      availableTools: llmTools,
      // Include primaryServerId to inform backend which server's tools are intended
      primaryServerId,
    },
    initialMessages,
    // FIX: Changed from object to number
    experimental_throttle: 100, // Optional: Throttle UI updates
    sendExtraMessageFields: true, // If you have custom fields in Message
    generateId: generateUUID, // Function to generate message IDs
    onFinish: (message) => {
      // Called when a response finishes streaming
      mutate("/api/history") // Revalidate chat history
      console.log("[Chat] Finished response for message:", message.id)
    },
    onError: (error) => {
      // Handle errors from the useChat hook/backend
      console.error("[Chat] useChat hook error:", error)
      toast.error(error.message || "An error occurred during the chat request!")
    },
    // --- NEW: onToolCall handler with correct signature for AI SDK 4.2.10 ---
    onToolCall: async ({ toolCall }: { toolCall: ToolCall<string, unknown> }) => {
      console.log(`[Chat] Received toolCall instruction:`, toolCall)
      const targetServerId = primaryServerId // Assume call is for primary server

      if (!targetServerId) {
        console.error("[Chat] Cannot handle toolCall: No primary server selected.")
        return { error: "No target server selected for tool call." } // Inform LLM
      }
      const serverStatus = serverStates[targetServerId]?.status
      if (serverStatus !== McpConnectionState.Running) {
        console.error(`[Chat] Cannot handle toolCall: Target server ${targetServerId} not running.`)
        return { error: `Target server ${targetServerId} is not running.` } // Inform LLM
      }

      try {
        // Access properties based on the actual structure of toolCall
        // Let's log the toolCall to see its structure
        console.debug(`[Chat] ToolCall structure:`, JSON.stringify(toolCall))

        // Extract tool name and arguments from the toolCall object
        // Using type assertion to access properties
        const toolName = (toolCall as any).type || (toolCall as any).toolName || (toolCall as any).function?.name
        const toolArgs = (toolCall as any).args || (toolCall as any).arguments || (toolCall as any).function?.arguments
        const toolCallId = (toolCall as any).id || (toolCall as any).toolCallId

        if (!toolName || !toolCallId) {
          console.error(`[Chat] Invalid toolCall structure:`, toolCall)
          return { error: "Invalid tool call structure" }
        }

        console.debug(`[Chat] Executing tool '${toolName}' on server ${targetServerId} with args:`, toolArgs)

        // Send the MCP 'tools/call' request via the context
        const mcpResult = await sendMcpRequest<any>(targetServerId, {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArgs,
          },
        })

        console.log(`[Chat] Received toolResult from MCP server ${targetServerId}:`, mcpResult)

        // Format the result
        let formattedResult
        if (mcpResult.result && typeof mcpResult.result === "object" && "content" in mcpResult.result) {
          formattedResult = (mcpResult.result.content as Array<{ type: string; text?: string }>)
            .map((part) => part.text ?? "")
            .join("\n")
        } else {
          formattedResult = mcpResult.result
        }

        return {
          toolCallId: toolCallId,
          toolName: toolName,
          result: formattedResult,
        }
      } catch (error: any) {
        console.error(`[Chat] Error executing tool call on server ${targetServerId}:`, error)

        // Try to extract tool name and ID for the error response
        const toolName =
          (toolCall as any).type || (toolCall as any).toolName || (toolCall as any).function?.name || "unknown"
        const toolCallId = (toolCall as any).id || (toolCall as any).toolCallId || "unknown"

        return {
          toolCallId: toolCallId,
          toolName: toolName,
          error: `Failed to execute tool: ${error.message || String(error)}`,
        }
      }
    },
  })

  const isLoading = isChatHookLoading || wsStatus === "connecting"

  const { data: votes } = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher)
  const [attachments, setAttachments] = useState<Array<Attachment>>([])
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)
  // Removed currentBody variable as it wasn't used

  return (
    <>
      <div className="flex flex-col min-w-0 h-content bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />
        <div className="flex items-center justify-between gap-4 px-4 pt-2 border-b pb-2">
          <div className="flex items-center gap-2 flex-shrink min-w-0">
            <label htmlFor="primary-server-select" className="text-xs text-muted-foreground flex-shrink-0">
              Chat Target:
            </label>
            <Select
              value={primaryServerId ?? ""}
              onValueChange={setPrimaryServerId}
              disabled={isLoading || runningServers.length === 0}
            >
              <SelectTrigger
                id="primary-server-select"
                className="h-8 text-xs w-full sm:w-[200px] truncate flex-shrink"
              >
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent>
                {runningServers.length === 0 && (
                  <SelectItem value="no-servers" disabled>
                    No running servers
                  </SelectItem>
                )}
                {runningServers.map((server) => (
                  <SelectItem key={server.id} value={server.id} className="text-xs">
                    {server.label || server.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow overflow-x-auto">
            {" "}
            <ActiveMCPServers />{" "}
          </div>
        </div>

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              // Pass the modified handleSubmit which includes availableTools
              handleSubmit={(e, { data } = {}) => {
                const currentToolState = primaryServerId ? serverTools[primaryServerId] : null
                // Ensure tools are actually fetched before submitting
                const toolsToSend =
                  currentToolState?.status === "fetched" && currentToolState.tools
                    ? convertMcpToolsToAiSdkFormat(currentToolState.tools as McpTool[])
                    : {}

                console.log(
                  `[Chat] Submitting message with ${Object.keys(toolsToSend).length} tools for server ${primaryServerId}`,
                )

                // FIX: Removed options property
                handleSubmit(e, {
                  data, // Pass through any extra data from MultimodalInput
                  body: {
                    // Updated to use body directly instead of options.body
                    id,
                    selectedChatModel,
                    availableTools: toolsToSend,
                    primaryServerId,
                  },
                })
              }}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      {/* Artifact rendering - Ensure it receives necessary props, including potential toolCalls */}
      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        // Pass the modified handleSubmit again
        handleSubmit={(e, { data } = {}) => {
          const currentToolState = primaryServerId ? serverTools[primaryServerId] : null
          const toolsToSend =
            currentToolState?.status === "fetched" && currentToolState.tools
              ? convertMcpToolsToAiSdkFormat(currentToolState.tools as McpTool[])
              : {}
          // FIX: Removed options property
          handleSubmit(e, {
            data,
            body: { id, selectedChatModel, availableTools: toolsToSend, primaryServerId },
          })
        }}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        // Consider if Artifact needs access to toolCalls or sendMcpRequest
      />
    </>
  )
}

