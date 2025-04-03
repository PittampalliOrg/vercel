'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { ServerConfig } from '@/lib/mcp/config'; // Import ServerConfig type

import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useMCPServers } from '@/components/providers/mcp-servers-provider'; // Import useMCPServers hook
import { toast } from 'sonner';
import { ActiveMCPServers } from "@/components/active-mcp-servers"

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { activeServers, serverConfigs } = useMCPServers(); // Get active servers and configs

  // Prepare active configurations to send to the backend
  const activeMcpConfigs = activeServers
    .map(name => serverConfigs[name])
    .filter((config): config is ServerConfig => !!config);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    api: '/frontend/api/chat', // Ensure this path is correct
    // Send active MCP configs in the body
    body: {
      id,
      selectedChatModel: selectedChatModel,
      activeMcpConfigs: activeMcpConfigs, // Pass active configs here
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error('An error occurred, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

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
              handleSubmit={(e, opts) => handleSubmit(e, {
                  ...opts,
                  body: {
                      id,
                      selectedChatModel: selectedChatModel,
                      activeMcpConfigs: activeServers.map(name => serverConfigs[name]).filter(Boolean) as ServerConfig[],
                  }
              })}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={(msg, opts) => append(msg, {
                ...opts,
                 body: {
                      id,
                      selectedChatModel: selectedChatModel,
                      activeMcpConfigs: activeServers.map(name => serverConfigs[name]).filter(Boolean) as ServerConfig[],
                  }
              })}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
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
  );
}
