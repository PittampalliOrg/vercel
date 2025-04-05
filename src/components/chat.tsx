"use client"

import type { Attachment, Message, ToolCallPart } from "ai"
import type { ToolCall } from "ai" // Import ToolCall with correct type
import { useChat } from "@ai-sdk/react"
import { useState, useEffect, useCallback, useMemo } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import { CompatibilityCallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"

import { ChatHeader } from "@/components/chat-header"
import type { Vote } from "@/lib/db/schema"
import { fetcher, generateUUID } from "@/lib/utils"
import { Artifact } from "./artifact"
import { MultimodalInput } from "./multimodal-input"
import { Messages } from "./messages"
import type { VisibilityType } from "./visibility-selector"
import { useArtifactSelector } from "@/hooks/use-artifact"
import { useMcpConnectionManager } from "@/lib/contexts/McpConnectionManagerContext"
import { McpConnectionStateType } from "@/lib/mcp/multi-connection-types"
import { convertMcpToolsToAiSdkFormat } from "@/lib/ai/format-tools"
import { ActiveMCPServers } from "@/components/active-mcp-servers"

const LOCAL_TOOL_NAMES = ["getWeather", "createDocument", "updateDocument", "requestSuggestions"]

// Helper Function (Adapt for Namespacing if needed)
function adaptAndAggregateMcpTools(
  serverStates: Readonly<Record<string, import("@/lib/mcp/multi-connection-types").McpServerRuntimeState>>,
): ReturnType<typeof convertMcpToolsToAiSdkFormat> {
  let aggregatedTools: Record<string, any> = {}
  Object.entries(serverStates).forEach(([serverName, state]) => {
    if (state.status.state === McpConnectionStateType.Running && state.tools.length > 0) {
      const namespacedTools = state.tools.map((tool) => ({
        ...tool,
        name: `${serverName}___${tool.name}`,
      }))
      const formatted = convertMcpToolsToAiSdkFormat(namespacedTools)
      aggregatedTools = { ...aggregatedTools, ...formatted }
    }
  })
  return aggregatedTools
}

// Create a type that adapts ToolCall to ToolCallPart
// This is needed because Messages component expects ToolCallPart
type AdaptedToolCallPart = ToolCall<string, unknown> & { type: "tool_call" }

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
  const { serverStates, makeRequest } = useMcpConnectionManager()

  const llmTools = useMemo(() => adaptAndAggregateMcpTools(serverStates), [serverStates])
  // Use ToolCallPart type for pendingToolConfirmations to match Messages component expectations
  const [pendingToolConfirmations, setPendingToolConfirmations] = useState<Record<string, ToolCallPart>>({})

  const { messages, setMessages, handleSubmit, input, setInput, append, isLoading, stop, reload } = useChat({
    id,
    api: "/frontend/api/chat",
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => mutate("/api/history"),
    onError: (error) => {
      console.error("Chat hook error:", error)
      toast.error(error.message || "An error occurred, please try again!")
    },
    // Remove 'tools' property as it's not supported in this version of the AI SDK
    // The tools will be passed via the body parameter in the requests
    onToolCall: ({ toolCall }: { toolCall: ToolCall<string, unknown> }) => {
      console.log("[Chat:onToolCall] Received tool call:", toolCall)

      // Create an adapted tool call with the 'type' property
      const adaptedToolCall: ToolCallPart = {
        ...toolCall,
        type: "tool-call",
      }

      const { toolName, args, toolCallId } = adaptedToolCall
      const nameParts = toolName.split("___")
      const isMcpTool = nameParts.length === 2
      const serverName = isMcpTool ? nameParts[0] : undefined
      const originalToolName = isMcpTool ? nameParts[1] : toolName

      if (isMcpTool && serverName) {
        const serverState = serverStates[serverName]
        if (serverState?.status.state !== McpConnectionStateType.Running) {
          console.warn(
            `[Chat:onToolCall] Server ${serverName} not connected for tool ${originalToolName}. Returning error result.`,
          )
          return {
            toolCallId,
            toolName,
            args,
            result: { error: `MCP server "${serverName}" is not connected.` },
          }
        } else {
          console.log(
            `[Chat:onToolCall] Adding MCP tool ${originalToolName} (from ${serverName}) to pending confirmations.`,
          )
          setPendingToolConfirmations((currentPending) => ({ ...currentPending, [toolCallId]: adaptedToolCall }))
          return undefined
        }
      } else if (LOCAL_TOOL_NAMES.includes(toolName)) {
        console.log(`[Chat:onToolCall] Executing local tool: ${toolName}`)
        let result: any
        try {
          if (toolName === "getWeather") result = { temperature: 22, unit: "C" }
          else result = { success: true, message: `Local tool ${toolName} executed.` }
          return { toolCallId, toolName, args, result }
        } catch (error: any) {
          return { toolCallId, toolName, args, result: { error: error.message || String(error) } }
        }
      } else {
        console.warn(`[Chat:onToolCall] Tool "${toolName}" not found. Returning error result.`)
        return {
          toolCallId,
          toolName,
          args,
          result: { error: `Tool "${toolName}" is not available.` },
        }
      }
    },
  })

  // Manual Message Update Helper
  const addAsyncToolResult = useCallback(
    (toolCallId: string, toolName: string, result: any) => {
      setMessages((currentMessages) => {
        const resultExists = currentMessages.some((msg) =>
          msg.toolInvocations?.some((inv) => inv.toolCallId === toolCallId && inv.state === "result"),
        )
        if (resultExists) {
          console.warn(`[Chat] Tool result/message for ${toolCallId} seems to already exist. Skipping manual add.`)
          return currentMessages
        }

        let lastAssistantIndex = -1
        for (let i = currentMessages.length - 1; i >= 0; i--) {
          if (currentMessages[i].role === "assistant") {
            lastAssistantIndex = i
            break
          }
        }
        if (lastAssistantIndex === -1) lastAssistantIndex = currentMessages.length - 1

        const newMessages = [...currentMessages]

        // Create a message with role 'assistant' instead of 'tool'
        const toolResultMessage: Message = {
          id: generateUUID(),
          role: "assistant", // Changed from 'tool' to 'assistant'
          content: JSON.stringify(result),
          toolInvocations: [{ toolCallId, toolName, result, state: "result", args: {} }],
        }

        newMessages.splice(lastAssistantIndex + 1, 0, toolResultMessage)
        console.log(`[Chat] Manually adding tool result for ${toolCallId}`, toolResultMessage)
        return newMessages
      })
    },
    [setMessages],
  )

  // useEffect for clearing pending confirmations
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    // Remove the check for lastMessage.role !== 'tool' since we're not using 'tool' role anymore
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.content &&
      !lastMessage.toolInvocations?.some((inv) => inv.state === "call")
    ) {
      if (Object.keys(pendingToolConfirmations).length > 0) {
        console.log("[Chat:useEffect] Clearing pending confirmations as assistant provided content response.")
        setPendingToolConfirmations({})
      }
    }
  }, [messages, pendingToolConfirmations])

  // executeMcpTool
  const executeMcpTool = useCallback(
    async (toolCall: ToolCallPart) => {
      const { toolName, args, toolCallId } = toolCall
      const nameParts = toolName.split("___")
      if (nameParts.length !== 2) {
        console.error(`[Chat:executeMcpTool] Invalid namespaced tool name: ${toolName}`)
        addAsyncToolResult(toolCallId, toolName, { error: `Internal error: Invalid tool name format ${toolName}` })
        return
      }
      const serverName = nameParts[0]
      const originalToolName = nameParts[1]

      console.log(
        `[Chat] Client executing confirmed MCP tool: ${originalToolName} on server ${serverName} (Call ID: ${toolCallId}) with args:`,
        args,
      )

      const serverState = serverStates[serverName]
      if (serverState?.status.state !== McpConnectionStateType.Running) {
        const errorMsg = `MCP server "${serverName}" is not connected.`
        toast.error(`Cannot execute tool "${originalToolName}": ${errorMsg}`)
        addAsyncToolResult(toolCallId, toolName, { error: errorMsg })
        return
      }

      const validatedArgs = typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {}

      try {
        const result = await makeRequest(
          serverName,
          { method: "tools/call", params: { name: originalToolName, arguments: validatedArgs } },
          CompatibilityCallToolResultSchema,
        )
        console.log(`[Chat] MCP tool "${originalToolName}" result:`, result)
        addAsyncToolResult(toolCallId, toolName, result)
      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.error(`[Chat] Error executing MCP tool "${originalToolName}" on ${serverName}:`, error)
        toast.error(`Error executing tool "${originalToolName}": ${errorMsg}`)
        addAsyncToolResult(toolCallId, toolName, { error: errorMsg })
      }
    },
    [serverStates, makeRequest, addAsyncToolResult],
  )

  // handleUserConfirmation
  const handleUserConfirmation = useCallback(
    (toolCallId: string, confirmed: boolean) => {
      const toolCall = pendingToolConfirmations[toolCallId]
      if (!toolCall) return

      console.log(`[Chat] User confirmation for ${toolCall.toolName} (ID: ${toolCallId}): ${confirmed}`)

      setPendingToolConfirmations((prev) => {
        const newState = { ...prev }
        delete newState[toolCallId]
        return newState
      })

      if (confirmed) {
        void executeMcpTool(toolCall)
      } else {
        addAsyncToolResult(toolCallId, toolCall.toolName, {
          error: `User denied execution of tool ${toolCall.toolName}`,
        })
      }
    },
    [pendingToolConfirmations, executeMcpTool, addAsyncToolResult],
  )

  const { data: votes } = useSWR<Array<Vote>>(`/api/history/vote?chatId=${id}`, fetcher)
  const [attachments, setAttachments] = useState<Array<Attachment>>([])
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)
  const getCurrentChatBody = useCallback(
    () => ({ id, selectedChatModel, availableTools: llmTools }),
    [id, selectedChatModel, llmTools],
  )

  return (
    <>
      <div className="flex flex-col min-w-0 h-content bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />
        <div className="px-4 pt-2">
          <ActiveMCPServers />
        </div>
        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={(opts) => reload({ ...opts, body: getCurrentChatBody() })}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />
        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={(e, opts) => handleSubmit(e, { ...opts, body: getCurrentChatBody() })}
              isLoading={isLoading || Object.keys(pendingToolConfirmations).length > 0}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={(msg, opts) => append(msg, { ...opts, body: getCurrentChatBody() })}
            />
          )}
        </form>
      </div>
      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={(e, opts) => handleSubmit(e, { ...opts, body: getCurrentChatBody() })}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={(msg, opts) => append(msg, { ...opts, body: getCurrentChatBody() })}
        messages={messages}
        setMessages={setMessages}
        reload={(opts) => reload({ ...opts, body: getCurrentChatBody() })}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  )
}

