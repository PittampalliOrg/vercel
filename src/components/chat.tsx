"use client"

// Import MessagePart specifically for type narrowing in useEffect
import type { Attachment, Message, ToolCallPart } from "ai"
import { useChat } from "@ai-sdk/react"
import { useState, useEffect, useCallback } from "react"
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
import { useSharedMcp } from "@/lib/contexts/SharedMcpContext"
import { convertMcpToolsToAiSdkFormat } from "@/lib/ai/format-tools"
import { ActiveMCPServers } from "@/components/active-mcp-servers"

const LOCAL_TOOL_NAMES = ["getWeather", "createDocument", "updateDocument", "requestSuggestions"]

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
  const { connectionStatus, makeRequest, fetchedMcpTools } = useSharedMcp()

  const [llmTools, setLlmTools] = useState<ReturnType<typeof convertMcpToolsToAiSdkFormat>>({})
  // Store pending ToolCallPart objects
  const [pendingToolConfirmations, setPendingToolConfirmations] = useState<Record<string, ToolCallPart>>({})

  useEffect(() => {
    if (connectionStatus === "connected") {
      const formattedMcpTools = convertMcpToolsToAiSdkFormat(fetchedMcpTools)
      setLlmTools({ ...formattedMcpTools })
      console.log("Formatted MCP tools for LLM:", Object.keys(formattedMcpTools))
    } else {
      setLlmTools({})
    }
  }, [fetchedMcpTools, connectionStatus])

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append, // Use append to send tool results
    isLoading,
    stop,
    reload,
    // NOTE: addToolResult removed
  } = useChat({
    id,
    api: "/frontend/api/chat",
    body: {
      id,
      selectedChatModel: selectedChatModel,
      availableTools: llmTools,
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate("/api/history")
    },
    onError: (error) => {
      console.error("Chat hook error:", error)
      toast.error(error.message || "An error occurred, please try again!")
    },
  })

  // --- Corrected useEffect for pending confirmations ---
  useEffect(() => {
    const pending: Record<string, ToolCallPart> = {}
    let needsUpdate = false

    // Check the last assistant message for pending calls
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      for (const invocation of lastMessage.toolInvocations) {
        // Check if it's a call state and not a local tool
        if (invocation.state === "call" && !LOCAL_TOOL_NAMES.includes(invocation.toolName)) {
          // If it's not already in the current pending state, mark for update
          if (!pendingToolConfirmations[invocation.toolCallId]) {
            // Create a proper ToolCallPart object
            pending[invocation.toolCallId] = {
              type: "tool-call",
              toolCallId: invocation.toolCallId,
              toolName: invocation.toolName,
              args: invocation.args,
            }
            needsUpdate = true
          } else {
            // If it was already pending, keep it
            pending[invocation.toolCallId] = pendingToolConfirmations[invocation.toolCallId]
          }
        }
      }
    }

    // Check if the number of pending items differs (simple check for changes)
    if (Object.keys(pending).length !== Object.keys(pendingToolConfirmations).length) {
      needsUpdate = true
    }

    if (needsUpdate) {
      console.log("Updating pending confirmations:", Object.keys(pending))
      setPendingToolConfirmations(pending)
    }
    // Only depend on messages array content
  }, [messages]) // Removed pendingToolConfirmations from deps to avoid loops

  const executeMcpTool = useCallback(
    async (toolCall: ToolCallPart) => {
      const { toolName, args, toolCallId } = toolCall
      console.log(`Client executing confirmed MCP tool: ${toolName} (Call ID: ${toolCallId}) with args:`, args)

      if (connectionStatus !== "connected") {
        toast.error(`Cannot execute tool "${toolName}": MCP client not connected.`)
        // Use append for error result with content as string
        append({
          role: "assistant",
          content: `Error: MCP client not connected when trying to execute ${toolName}`,
        })
        return
      }

      const validatedArgs = typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {}
      if (typeof args !== "object" || args === null) {
        console.warn(`Tool call arguments for ${toolName} are not an object, using empty object. Original args:`, args)
      }

      try {
        const result = await makeRequest(
          {
            method: "tools/call",
            params: { name: toolName, arguments: validatedArgs },
          },
          CompatibilityCallToolResultSchema,
        )
        console.log(`MCP tool "${toolName}" result:`, result)
        // Use append for success result
        append({
          role: "assistant",
          content: `Tool ${toolName} executed successfully with result: ${JSON.stringify(result)}`,
        })
      } catch (error: any) {
        console.error(`Error executing MCP tool "${toolName}":`, error)
        toast.error(`Error executing tool "${toolName}": ${error.message || String(error)}`)
        // Use append for error result
        append({
          role: "assistant",
          content: `Error executing tool ${toolName}: ${error.message || String(error)}`,
        })
      }
    },
    [connectionStatus, makeRequest, append],
  )

  const handleUserConfirmation = useCallback(
    (toolCallId: string, confirmed: boolean) => {
      const toolCall = pendingToolConfirmations[toolCallId]
      if (!toolCall) return

      // Remove from pending state immediately
      setPendingToolConfirmations((prev) => {
        const newState = { ...prev }
        delete newState[toolCallId]
        return newState
      })

      if (confirmed) {
        // Execute async
        void executeMcpTool(toolCall)
      } else {
        // User denied, send denial result back via append
        append({
          role: "assistant",
          content: `User denied execution of tool ${toolCall.toolName}`,
        })
      }
    },
    [pendingToolConfirmations, append, executeMcpTool],
  )

  const { data: votes } = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher)

  const [attachments, setAttachments] = useState<Array<Attachment>>([])
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)
  const currentBody = { id, selectedChatModel, availableTools: llmTools }

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
          reload={(opts) => reload({ ...opts, body: currentBody })}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          pendingToolConfirmations={pendingToolConfirmations}
          onUserConfirmation={handleUserConfirmation}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={(e, opts) => handleSubmit(e, { ...opts, body: currentBody })}
              isLoading={isLoading || Object.keys(pendingToolConfirmations).length > 0}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={(msg, opts) => append(msg, { ...opts, body: currentBody })}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={(e, opts) => handleSubmit(e, { ...opts, body: currentBody })}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={(msg, opts) => append(msg, { ...opts, body: currentBody })}
        messages={messages}
        setMessages={setMessages}
        reload={(opts) => reload({ ...opts, body: currentBody })}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  )
}

