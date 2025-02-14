import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export async function GET(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('GET /api/vote', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/vote/route.ts:8');
      span.addEvent('Handling GET /api/vote');

      const { searchParams } = new URL(request.url);
      const chatId = searchParams.get('chatId');

      if (!chatId) {
        return new Response('chatId is required', { status: 400 });
      }

      const session = await auth();
      if (!session || !session.user || !session.user.email) {
        return new Response('Unauthorized', { status: 401 });
      }

      const votes = await getVotesByChatId({ id: chatId });
      return new Response(JSON.stringify(votes), { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Votes GET error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;
      span.end();
    }
  });
}

export async function PATCH(request: Request) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('PATCH /api/vote', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/vote/route.ts:39');
      span.addEvent('Handling PATCH /api/vote');

      const { chatId, messageId, type }: {
        chatId: string;
        messageId: string;
        type: 'up' | 'down';
      } = await request.json();

      if (!chatId || !messageId || !type) {
        return new Response('messageId and type are required', { status: 400 });
      }

      const session = await auth();
      if (!session || !session.user || !session.user.email) {
        return new Response('Unauthorized', { status: 401 });
      }

      await voteMessage({
        chatId,
        messageId,
        type,
      });

      return new Response('Message voted', { status: 200 });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return new Response('Vote PATCH error', { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}
