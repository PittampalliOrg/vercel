import { ChatRequestOptions, Message, ToolCallPart, ToolInvocation } from 'ai'; // Import ToolInvocation for broader type check
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo } from 'react';
import { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import { ToolConfirmation } from './tool-confirmation';

interface MessagesProps {
  chatId: string;
  isLoading: boolean;
  votes: Array<Vote> | undefined;
  messages: Array<Message>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  pendingToolConfirmations: Record<string, ToolCallPart>;
  onUserConfirmation: (toolCallId: string, confirmed: boolean) => void;
}

function PureMessages({
  chatId,
  isLoading,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  isArtifactVisible,
  pendingToolConfirmations,
  onUserConfirmation,
}: MessagesProps) {
  // Fix: Remove arguments from useScrollToBottom if it expects none
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => (
          <div key={message.id}>
            <PreviewMessage
              chatId={chatId}
              message={message}
              isLoading={isLoading && messages.length - 1 === index}
              vote={
                votes
                  ? votes.find((vote) => vote.messageId === message.id)
                  : undefined
              }
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
            />
            {/* Render Confirmation UI */}
            {message.role === 'assistant' && message.toolInvocations?.map(invocation => {
                // Check if this specific invocation is pending user confirmation
                const pendingInvocation = pendingToolConfirmations[invocation.toolCallId];
                 // Fix: Check state instead of type
                if (pendingInvocation && invocation.state === 'call') {
                    return (
                        <ToolConfirmation
                            key={invocation.toolCallId}
                            toolCall={pendingInvocation}
                            onConfirm={() => onUserConfirmation(invocation.toolCallId, true)}
                            onDeny={() => onUserConfirmation(invocation.toolCallId, false)}
                        />
                    );
                }
                return null;
            })}
          </div>
      ))}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLoading && nextProps.isLoading) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (!equal(prevProps.pendingToolConfirmations, nextProps.pendingToolConfirmations)) return false;

  return true;
});