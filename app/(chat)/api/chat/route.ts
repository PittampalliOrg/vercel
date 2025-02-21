import {
  type Message,
  convertToCoreMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { context, propagation, trace, SpanStatusCode } from '@opentelemetry/api';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
// import {
//   deleteChatById,
//   getChatById,
//   saveChat,
//   saveMessages,
// } from '@/lib/db/queries';
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
import { logger } from "@/lib/logger"
import { dbActions } from '@/lib/db/queries';

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
  // 1) Extract the "traceparent" (and other possible baggage) from the incoming headers
  const carrier: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    carrier[key] = value;
  }

  logger.info('Logging POST /chat', request.headers.entries());
  
  const extractedContext = propagation.extract(context.active(), carrier);
  const serverTracer = trace.getTracer('server-tracer');

  // 2) Run the entire POST logic in that extracted context, with a new "POST /api/chat" span
  return context.with(extractedContext, async () => {
    return serverTracer.startActiveSpan('POST /api/chat', async (span) => {
      try {
        span.addEvent('Handling POST /api/chat', carrier);
        logger.error('Handling POST /api/chat', carrier);
        const { id, messages, modelId }: {
          id: string;
          messages: Array<Message>;
          modelId: string;
        } = await request.json();

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

        let chat = await dbActions.getChatById({ id });
        if (!chat) {
          const title = await generateTitleFromUserMessage({ message: userMessage });
          await dbActions.saveChat({ id, userId: session.user!.id!, title });
        }

        const userMessageId = generateUUID();
        await dbActions.saveMessages({
          messages: [
            {
              ...userMessage,
              id: userMessageId,
              createdAt: new Date(),
              chatId: id,
            },
          ],
        });

        return createDataStreamResponse({
          execute: (dataStream) => {
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
                try {
                  const cleaned = sanitizeResponseMessages(response.messages);
                  await dbActions.saveMessages({
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
                logger.info('Chat saved', response)
              },
              experimental_telemetry: {
                isEnabled: true,
                functionId: 'stream-text',
              },
            });

            result.mergeIntoDataStream(dataStream);
          },
        });
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        console.error('Error in POST /api/chat:', err);
        return new Response('Internal Server Error', { status: 500 });
      } finally {
        const traceId = span.spanContext().traceId;
        const spanId = span.spanContext().spanId;

        span.end();
      }
    });
  });
}

export async function DELETE(request: Request) {
  // For demonstration, we add a startActiveSpan here
  const serverTracer = trace.getTracer('server-tracer');
  return serverTracer.startActiveSpan('DELETE /api/chat', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/chat/route.ts:183');
      span.addEvent('Handling DELETE /api/chat');

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) {
        return new Response('Not Found', { status: 404 });
      }

      const session = await auth();
      if (!session?.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const chat = await dbActions.getChatById({ id });
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
      await dbActions.deleteChatById({ id });
      return new Response('Chat deleted', { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Error deleting chat', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;
 
      span.end();
    }
  });
}
