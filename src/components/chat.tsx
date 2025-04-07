"use client";
// ... other imports ...
import type { Attachment, Message, ToolCall, ToolResult, ChatRequestOptions } from "ai";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import type { Tool as McpTool } from "@/lib/mcp/mcp.types";
import { ChatHeader } from "@/components/chat-header";
import type { Vote } from "@/lib/db/schema";
import { fetcher, generateUUID, convertToUIMessages, sanitizeUIMessages } from "@/lib/utils";
import { Artifact } from "./artifact";
import { MultimodalInput } from "./multimodal-input";
import { Messages } from "./messages";
import type { VisibilityType } from "./visibility-selector";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useMcpManager } from "@/lib/contexts/McpManagerContext";
import { ActiveMCPServers } from "@/components/active-mcp-servers";
import { McpConnectionState, ManagedServerState } from "@/lib/mcp/mcp.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatProps {
  className?: string;
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
    sendChatPrompt,
    selectedTools,
  } = useMcpManager()
  const [primaryServerId, setPrimaryServerId] = useState<string | null>(null)
  
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
        setPrimaryServerId(firstRunningId)
      }
    }
  }, [primaryServerId, serverStates, runningServers])
  
  // --- AI SDK useChat Hook Configuration ---
  const {
    messages,
    setMessages,
    handleSubmit: chatHookHandleSubmit,
    input,
    setInput,
    append,
    isLoading: isChatHookLoading,
    stop,
    reload,
    data,
  } = useChat({
    id,
    api: "/frontend/api/chat", // Your Next.js API endpoint
    body: {
      // Data sent WITH EACH request to YOUR /api/chat endpoint
      id,
      selectedChatModel,
      primaryServerId, // Useful for context if bridge handles multiple servers
      selectedTools, // Send the user-selected tool IDs
    },
    initialMessages,
    streamProtocol: "data",
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: (message) => {
      mutate("/api/history");
      console.info(`[Chat ${id}] Finished response for message: ${message.id}`);
      setMessages(msgs => sanitizeUIMessages(msgs));
    },
    onError: (error) => {
      console.error(`[Chat ${id}] useChat hook error:`, error);
      toast.error(error.message || "An error occurred during the chat request!");
      setMessages(msgs => sanitizeUIMessages(msgs));
    },
  });
  
  const isLoading = isChatHookLoading || wsStatus === "connecting";
  
  // Effect to handle custom stream data from the backend bridge via StreamData
  useEffect(() => {
    if (data && Array.isArray(data)) {
        data.forEach((dataItem: any) => {
            try {
                if (dataItem.type === 'toolStart') {
                    setMessages(currentMessages => {
                         const lastMessage = currentMessages[currentMessages.length - 1];
                         if (lastMessage && lastMessage.role === 'assistant') {
                              return [
                                   ...currentMessages.slice(0, -1),
                                   {
                                        ...lastMessage,
                                        toolInvocations: [
                                             ...(lastMessage.toolInvocations ?? []),
                                             {
                                                 toolCallId: dataItem.payload.toolCallId,
                                                 toolName: dataItem.payload.toolName,
                                                 args: dataItem.payload.toolInput,
                                                 state: 'call',
                                             }
                                        ]
                                   }
                              ];
                         } else {
                               return [
                                    ...currentMessages,
                                    {
                                        id: generateUUID(),
                                        role: 'assistant',
                                        content: '',
                                        toolInvocations: [{
                                             toolCallId: dataItem.payload.toolCallId,
                                             toolName: dataItem.payload.toolName,
                                             args: dataItem.payload.toolInput,
                                             state: 'call',
                                        }]
                                    }
                               ];
                         }
                    });
                } else if (dataItem.type === 'toolEnd') {
                    setMessages(currentMessages => currentMessages.map(msg => {
                        if (msg.toolInvocations) {
                            return {
                                ...msg,
                                toolInvocations: msg.toolInvocations.map(inv => {
                                    if (inv.toolCallId === dataItem.payload.toolCallId) {
                                        console.debug(`[Chat ${id}] Updating tool result for ${inv.toolName} (${inv.toolCallId})`);
                                        return {
                                            ...inv,
                                            state: 'result',
                                            result: dataItem.payload.output,
                                        };
                                    }
                                    return inv;
                                })
                            };
                        }
                        return msg;
                    }));
                } else if (dataItem.type === 'chatError') {
                     toast.error(dataItem.payload.message);
                } else if (dataItem.type === 'chatEnd') {
                    console.debug(`[Chat ${id}] Received chatEnd from stream data.`);
                }
            } catch (error) {
                 console.error(`[Chat ${id}] Error processing stream data item:`, error, 'Data:', dataItem);
            }
        });
    }
  }, [data, setMessages]);
  
  const { data: votes } = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)
  
  // Create a type-compatible handleSubmit function for MultimodalInput and Artifact components
  const handleFormSubmit = useCallback(
    (event?: { preventDefault?: () => void } | undefined, chatRequestOptions?: ChatRequestOptions | undefined) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      
      const options: ChatRequestOptions = {
        ...chatRequestOptions,
        body: {
          id,
          selectedChatModel,
          primaryServerId,
          selectedTools,
          ...(chatRequestOptions?.body || {})
        },
        experimental_attachments: attachments,
        data: chatRequestOptions?.data
      };
      
      chatHookHandleSubmit(event, options);
      setAttachments([]);
    },
    [chatHookHandleSubmit, id, selectedChatModel, primaryServerId, selectedTools, attachments]
  );

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
                 disabled={isLoading || runningServers.length === 0 || wsStatus !== 'open'}
              >
                 <SelectTrigger
                    id="primary-server-select"
                    className="h-8 text-xs w-full sm:w-[200px] truncate flex-shrink"
                 >
                    <SelectValue placeholder="Select target..." />
                 </SelectTrigger>
                 <SelectContent>
                    {runningServers.length === 0 && wsStatus === 'open' && (
                       <SelectItem value="no-servers" disabled>
                          No running servers
                       </SelectItem>
                    )}
                     {wsStatus !== 'open' && (
                         <SelectItem value="ws-disconnected" disabled>
                              {wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
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
               <ActiveMCPServers />
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
        <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleFormSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </div>
      </div>
      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleFormSubmit}
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
      />
    </>
  )
}