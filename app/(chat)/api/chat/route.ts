import * as traceloop from '@traceloop/node-server-sdk';
import {
  type Message,
  convertToCoreMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';

export const maxDuration = 60;

type AllowedTools =
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];
const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

export async function POST(request: Request) {
  const { id, messages, modelId }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = models.find((m) => m.id === modelId);
  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);
  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  // Wrap the streaming logic in a Traceloop workflow
  return traceloop.withWorkflow(
    { name: 'chat' }, // The workflow name
    async () => {
      // Ensure chat record exists; if not, create it
      let chat = await getChatById({ id });
      if (!chat) {
        const title = await generateTitleFromUserMessage({ message: userMessage });
        await saveChat({ id, userId: session.user.id, title });
      }

      // Persist the user's newest message
      const userMessageId = generateUUID();
      await saveMessages({
        messages: [
          { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
        ],
      });

      // Return a streaming response
      return createDataStreamResponse({
        execute: (dataStream) => {
          // Immediately inform the client of the user message ID (used for partial UI updates)
          dataStream.writeData({
            type: 'user-message-id',
            content: userMessageId,
          });

          const result = streamText({
            model: customModel(model.apiIdentifier),
            system: systemPrompt,
            messages: coreMessages,
            maxSteps: 5,
            experimental_activeTools: allTools,
            experimental_transform: smoothStream({ chunking: 'word' }),
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream, model }),
              updateDocument: updateDocument({ session, dataStream, model }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
                model,
              }),
            },
            onFinish: async ({ response }) => {
              // When streaming finishes, persist the assistant messages
              try {
                const cleaned = sanitizeResponseMessages(response.messages);
                await saveMessages({
                  messages: cleaned.map((message) => {
                    const messageId = generateUUID();
                    if (message.role === 'assistant') {
                      dataStream.writeMessageAnnotation({
                        messageIdFromServer: messageId,
                      });
                    }
                    return {
                      id: messageId,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    };
                  }),
                });
              } catch (error) {
                console.error('Failed to save chat', error);
              }
            },
            // Telemetry for the AI flow
            experimental_telemetry: {
              isEnabled: true,
              functionId: 'stream-text', // e.g., "chat"
            },
          });

          // Merge the token-by-token stream into the DataStream
          result.mergeIntoDataStream(dataStream);
        },
      });
    },
    // Include extra metadata for Traceloop
    { question: userMessage.content }
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });
    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }
    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
